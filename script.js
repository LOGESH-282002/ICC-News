const API_KEY = "27b5b1dc646a47c78087f995fdf12b5f";
let currentDateFilter = "";
const MAX_PAGES_TO_FETCH = 5;
const ARTICLES_PER_PAGE = 9;
let currentPage = 1;
let allArticles = [];
let filteredArticles = [];
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
function getDefaultSearchTerm() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const validCategories = ['home','general', 'business', 'entertainment', 'health', 'science', 'sports', 'technology'];
    return validCategories.includes(category) ? category : 'general';
}
function saveSearchQuery(query) {
    localStorage.setItem('lastSearchQuery', query);
    localStorage.setItem('lastSearchPage', window.location.pathname);
}
function getSavedSearchQuery() {
    const savedPage = localStorage.getItem('lastSearchPage');
    const savedQuery = localStorage.getItem('lastSearchQuery');
    if (savedPage === window.location.pathname && savedQuery) {
        return savedQuery;
    }
    return null;
}
function clearSavedSearch() {
    localStorage.removeItem('lastSearchQuery');
    localStorage.removeItem('lastSearchPage');
}
function getPageFromURL() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('page')) || 1;
}
function setPageInURL(page) {
    const params = new URLSearchParams(window.location.search);
    params.set('page', page);
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}
window.addEventListener('load', () => {
    const searchInput = document.querySelector('input.search');
    setupListViewButtons();
    setupDatePicker();
    setupPaginationEventListeners();
    
    const listParam = getQueryParam('list');
    if (listParam === 'liked' || listParam === 'disliked' || listParam === 'favorites') {
        showUserList(listParam);
        document.querySelectorAll('.list-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(listParam + '-btn');
        if (activeBtn) activeBtn.classList.add('active');
        return;
    }
    
    const savedQuery = getSavedSearchQuery();
    if (savedQuery) {
        if (searchInput) {
            searchInput.value = savedQuery;
        }
        fetchNews(savedQuery);
    } else {
        fetchNews(getDefaultSearchTerm());
    }
    if (searchInput) {
        const debouncedSearch = debounce(function(query) {
            if (query.trim()) {
                searchInput.classList.add('searching');
                if (currentListType) {
                    const articles = getUserListArticles(currentListType);
                    filteredArticles = filterArticlesByDate(
                        articles.filter(article =>
                            (article.title && article.title.toLowerCase().includes(query.toLowerCase())) ||
                            (article.description && article.description.toLowerCase().includes(query.toLowerCase()))
                        ),
                        currentDateFilter
                    );
                    currentPage = 1;
                    displayCurrentPage();
                    searchInput.classList.remove('searching');
                } else {
                    saveSearchQuery(query);
                    fetchNews(query).finally(() => {
                        searchInput.classList.remove('searching');
                    });
                }
            }
        }, 500);
        searchInput.addEventListener('input', function(event) {
            const query = event.target.value.trim();
            if (query.length >= 2) {
                debouncedSearch(query);
            } else if (query.length === 0) {
                searchInput.classList.add('searching');
                if (currentListType) {
                    const articles = getUserListArticles(currentListType);
                    filteredArticles = filterArticlesByDate(articles, currentDateFilter);
                    currentPage = 1;
                    displayCurrentPage();
                    searchInput.classList.remove('searching');
                } else {
                    clearSavedSearch(); 
                    fetchNews(getDefaultSearchTerm()).finally(() => {
                        searchInput.classList.remove('searching');
                    });
                }
            }
        });
        searchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    searchInput.classList.add('searching');
                    if (currentListType) {
                        const articles = getUserListArticles(currentListType);
                        filteredArticles = filterArticlesByDate(
                            articles.filter(article =>
                                (article.title && article.title.toLowerCase().includes(query.toLowerCase())) ||
                                (article.description && article.description.toLowerCase().includes(query.toLowerCase()))
                            ),
                            currentDateFilter
                        );
                        currentPage = 1;
                        displayCurrentPage();
                        searchInput.classList.remove('searching');
                    } else {
                        saveSearchQuery(query);
                        fetchNews(query).finally(() => {
                            searchInput.classList.remove('searching');
                        });
                    }
                }
            }
        });
    }
    currentPage = getPageFromURL();
});
function setupListViewButtons() {
    const likedBtn = document.getElementById('liked-btn');
    const dislikedBtn = document.getElementById('disliked-btn');
    const favoritesBtn = document.getElementById('favorites-btn');
    likedBtn.addEventListener('click', () => showUserList('liked'));
    dislikedBtn.addEventListener('click', () => showUserList('disliked'));
    favoritesBtn.addEventListener('click', () => showUserList('favorites'));
    updateListCounts();
}
function setupDatePicker() {
    const datePicker = document.getElementById('date-picker');
    if (datePicker) {
        datePicker.addEventListener('change', function() {
            currentDateFilter = this.value;
            console.log('Selected date:', currentDateFilter);
            const searchInput = document.querySelector('input.search');
            if (currentListType) {
                const articles = getUserListArticles(currentListType);
                filteredArticles = filterArticlesByDate(articles, currentDateFilter);
                currentPage = 1;
                displayCurrentPage();
            } else {
                const query = (searchInput && searchInput.value.trim()) || getDefaultSearchTerm();
                fetchNews(query);
            }
        });
    }
}
function filterArticlesByDate(articles, date) {
    if (!date || date === "") {
        return articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }
    const selectedDate = new Date(date);
    const start = new Date(selectedDate.setHours(0,0,0,0));
    const end = new Date(selectedDate.setHours(23,59,59,999));
    return articles.filter(article => {
        const articleDate = new Date(article.publishedAt);
        return articleDate >= start && articleDate <= end;
    }).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}
function updateListCounts() {
    const likedCount = getUserListArticles('liked').length;
    const dislikedCount = getUserListArticles('disliked').length;
    const favoritesCount = getUserListArticles('favorites').length;
    document.getElementById('liked-btn').textContent = `👍 Liked (${likedCount})`;
    document.getElementById('disliked-btn').textContent = `👎 Disliked (${dislikedCount})`;
    document.getElementById('favorites-btn').textContent = `⭐ Favorites (${favoritesCount})`;
}
let currentListType = null;
function backToNews() {
    currentListType = null;
    document.querySelectorAll('.list-btn').forEach(btn => btn.classList.remove('active'));
    const searchInput = document.querySelector('input.search');
    if (searchInput) {
        searchInput.value = '';
    }
    const datePicker = document.getElementById('date-picker');
    if (datePicker) {
        datePicker.value = '';
        currentDateFilter = "";
    }
    clearSavedSearch();
    filteredArticles = filterArticlesByDate(allArticles, currentDateFilter);
    currentPage = 1;
    displayCurrentPage();
}
function showUserList(listType) {
    currentListType = listType; 
    document.querySelectorAll('.list-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${listType}-btn`).classList.add('active');
    const searchInput = document.querySelector('input.search');
    if (searchInput) {
        searchInput.value = '';
    }
    const articles = getUserListArticles(listType);
    filteredArticles = filterArticlesByDate(articles, currentDateFilter);
    currentPage = 1;
    if (filteredArticles.length === 0) {
        const cardContainer = document.getElementById('card-container');
        const paginationContainer = document.getElementById('pagination-container');
        const dateFilterText = currentDateFilter ? ` for the selected date range` : '';
        cardContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h3>No ${listType} articles found${dateFilterText}</h3>
                <p>You haven't ${listType} any articles yet.</p>
                <button class="back-btn list-btn" onclick="backToNews()">← Back to News</button>
            </div>
        `;
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
    } else {
        displayCurrentPage();
    }
}
function getUserListArticles(listType) {
    const articles = [];
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('article_')) {
            try {
                const state = JSON.parse(localStorage.getItem(key));
                const shouldInclude = listType === 'liked' ? state.userLiked : 
                                   listType === 'disliked' ? state.userDisliked : 
                                   listType === 'favorites' ? state.userFavorited : false;
                if (shouldInclude) {
                    const articleData = getArticleDataFromKey(key);
                    if (articleData) {
                        articles.push(articleData);
                    }
                }
            } catch (error) {}
        }
    });
    return articles;
}
function getArticleDataFromKey(key) {
    try {
        const savedData = JSON.parse(localStorage.getItem(key));
        if (savedData && savedData.articleData) {
            return savedData.articleData;
        }
        const articleId = key.replace('article_', '');
        return {
            title: `Article ${articleId.substring(0, 8)}...`,
            description: `This is a saved article.`,
            source: { name: 'Saved Article' },
            publishedAt: new Date().toISOString(),
            url: '#',
            urlToImage: 'https://via.placeholder.com/300x200?text=Saved+Article'
        };
    } catch (error) {
        return null;
    }
}
async function fetchNews(query) {
    try {
        const cardContainer = document.getElementById('card-container');
        if (cardContainer) {
            cardContainer.innerHTML = '<div style="text-align: center; padding: 40px;"><h3>Loading news articles...</h3><p>Fetching multiple pages for more content...</p></div>';
        }
        allArticles = await fetchMultiplePages(query);
        filteredArticles = filterArticlesByDate(allArticles, currentDateFilter);
        displayCurrentPage();
    } catch (error) {
        allArticles = [];
        filteredArticles = [];
        displayCurrentPage();
    }
}
async function fetchMultiplePages(query, maxPages = MAX_PAGES_TO_FETCH) {
    const allArticles = [];
    const categoryMap = {
        'general': 'general',
        'sports': 'sports',
        'technology': 'technology',
        'business': 'business',
        'entertainment': 'entertainment',
        'health': 'health',
        'science': 'science',
    };
    const category = categoryMap[query.toLowerCase()];
    for (let page = 1; page <= maxPages; page++) {
        try {
            let apiUrl;
            if (query.toLowerCase() === 'home') {
                apiUrl = `https://newsapi.org/v2/everything?q=news&apiKey=${API_KEY}&language=en&pageSize=100&page=${page}&sortBy=publishedAt`;
            } else if (category) {
                apiUrl = `https://newsapi.org/v2/top-headlines?category=${category}&apiKey=${API_KEY}&language=en&pageSize=100&page=${page}`;
            } else {
                apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${API_KEY}&language=en&pageSize=100&page=${page}&sortBy=publishedAt`;
            }
            if (currentDateFilter && currentDateFilter !== "") {
                const fromDate = `${currentDateFilter}T00:00:00`;
                const toDate = `${currentDateFilter}T23:59:59`;
                apiUrl += `&from=${fromDate}&to=${toDate}`;
            }
            console.log('NewsAPI URL:', apiUrl);
            let res = await fetch(apiUrl);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            console.log('NewsAPI response:', data);
            if (data.articles && Array.isArray(data.articles)) {
                allArticles.push(...data.articles);
            }
            if (data.articles.length < 100) {
                break;
            }
        } catch (error) {
            console.error('NewsAPI fetch error:', error);
            break;
        }
    }
    return allArticles;
}
function displayCurrentPage() {
    const cardContainer = document.getElementById('card-container');
    const paginationContainer = document.getElementById('pagination-container');
    if (!cardContainer) return;
    cardContainer.innerHTML = "";
    if (!filteredArticles || filteredArticles.length === 0) {
        cardContainer.innerHTML = '<p style="text-align: center; padding: 20px;">No news articles found.</p>';
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
        return;
    }
    const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
    const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
    const endIndex = Math.min(startIndex + ARTICLES_PER_PAGE, filteredArticles.length);
    const currentPageArticles = filteredArticles.slice(startIndex, endIndex);
    bindData(currentPageArticles);
    updatePagination(totalPages, startIndex, endIndex, filteredArticles.length);
}
function bindData(articles) {
    const cardContainer = document.getElementById('card-container');
    const newsCardTemplate = document.getElementById('news-card-template');
    if (!cardContainer || !newsCardTemplate) {
        return;
    }
    articles.forEach(article => {
        if (!article.urlToImage && !article.image) {
            return;
        }
        try {
            const cardClone = newsCardTemplate.cloneNode(true);
            cardClone.style.display = "block";
            fillDataInCard(cardClone, article);
            const readMoreLink = cardClone.querySelector('#news-link');
            if (readMoreLink) {
                readMoreLink.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            }
            cardContainer.appendChild(cardClone);
            cardClone.addEventListener('click', function(e) {
                if (e.target.closest('.action-btn')) return;
                openNewsModal(article);
            });
        } catch (error) {}
    });
    setupModalClose();
}
function fillDataInCard(cardClone, article) {
    const imageUrl = article.urlToImage || article.image;
    cardClone.querySelector('#news-img').src = imageUrl;
    cardClone.querySelector('#news-title').innerHTML = article.title;
    cardClone.querySelector('#news-desc').innerHTML = article.description;
    const sourceName = article.source?.name || article.source || 'Unknown Source';
    const publishDate = new Date(article.publishedAt).toLocaleString("en-US", { timeZone: "Asia/kolkata" });
    cardClone.querySelector('#news-source').innerHTML = sourceName + " • " + publishDate;
    cardClone.querySelector('#news-link').href = article.url;
    setupActionButtons(cardClone, article);
}
function setupActionButtons(cardClone, article) {
    const articleId = generateArticleId(article);
    const likeBtn = cardClone.querySelector('.like-btn');
    const dislikeBtn = cardClone.querySelector('.dislike-btn');
    const favoriteBtn = cardClone.querySelector('.favorite-btn');
    if (!likeBtn || !dislikeBtn || !favoriteBtn) {
        return;
    }
    const savedState = getArticleState(articleId);
    updateButtonState(likeBtn, savedState.likes, savedState.userLiked);
    updateButtonState(dislikeBtn, savedState.dislikes, savedState.userDisliked);
    updateButtonState(favoriteBtn, null, savedState.userFavorited);
    likeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleAction(articleId, 'like', likeBtn, dislikeBtn, article);
    });
    dislikeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleAction(articleId, 'dislike', dislikeBtn, likeBtn, article);
    });
    favoriteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleAction(articleId, 'favorite', favoriteBtn, null, article);
    });
}
function generateArticleId(article) {
    const title = article.title || '';
    const source = article.source?.name || article.source || '';
    const combined = title + source;
    return btoa(encodeURIComponent(combined)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
}
function getArticleState(articleId) {
    const saved = localStorage.getItem(`article_${articleId}`);
    return saved ? JSON.parse(saved) : {
        likes: 0,
        dislikes: 0,
        userLiked: false,
        userDisliked: false,
        userFavorited: false
    };
}
function saveArticleState(articleId, state, articleData = null) {
    const dataToSave = {
        ...state,
        articleData: articleData
    };
    localStorage.setItem(`article_${articleId}`, JSON.stringify(dataToSave));
}
function updateButtonState(button, count, isActive) {
    if (count !== null) {
        button.querySelector('.count').textContent = count;
    }
    if (isActive) {
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
}
function handleAction(articleId, action, primaryBtn, secondaryBtn = null, articleData = null) {
    const state = getArticleState(articleId);
    let removedFromList = false;
    switch (action) {
        case 'like':
            if (state.userLiked) {
                state.likes--;
                state.userLiked = false;
                removedFromList = currentListType === 'liked';
            } else {
                state.likes++;
                state.userLiked = true;
                if (state.userDisliked) {
                    state.dislikes--;
                    state.userDisliked = false;
                    if (secondaryBtn) {
                        updateButtonState(secondaryBtn, state.dislikes, false);
                    }
                }
            }
            break;
        case 'dislike':
            if (state.userDisliked) {
                state.dislikes--;
                state.userDisliked = false;
                removedFromList = currentListType === 'disliked';
            } else {
                state.dislikes++;
                state.userDisliked = true;
                if (state.userLiked) {
                    state.likes--;
                    state.userLiked = false;
                    if (secondaryBtn) {
                        updateButtonState(secondaryBtn, state.likes, false);
                    }
                }
            }
            break;
        case 'favorite':
            state.userFavorited = !state.userFavorited;
            if (!state.userFavorited && currentListType === 'favorites') {
                removedFromList = true;
            }
            break;
    }
    saveArticleState(articleId, state, articleData);
    if (action === 'like') {
        updateButtonState(primaryBtn, state.likes, state.userLiked);
    } else if (action === 'dislike') {
        updateButtonState(primaryBtn, state.dislikes, state.userDisliked);
    } else if (action === 'favorite') {
        updateButtonState(primaryBtn, null, state.userFavorited);
    }
    updateListCounts();
    showActionFeedback(action, state);
    if (removedFromList && currentListType) {
        showUserList(currentListType);
    }
}
function showActionFeedback(action, state) {
    const messages = {
        like: state.userLiked ? 'Liked!' : 'Removed like',
        dislike: state.userDisliked ? 'Disliked!' : 'Removed dislike',
        favorite: state.userFavorited ? 'Added to favorites!' : 'Removed from favorites'
    };
    const feedback = document.createElement('div');
    feedback.textContent = messages[action];
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1a237e;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        z-index: 1000;
        font-size: 0.9rem;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(feedback);
    setTimeout(() => {
        feedback.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }, 2000);
}
function openNewsModal(article) {
    const modal = document.getElementById('news-modal');
    if (!modal) return;
    document.getElementById('modal-img').src = article.urlToImage || article.image || '';
    document.getElementById('modal-title').textContent = article.title || '';
    document.getElementById('modal-source').textContent = (article.source?.name || article.source || '') + ' • ' + (article.publishedAt ? new Date(article.publishedAt).toLocaleString("en-US", { timeZone: "Asia/kolkata" }) : '');
    document.getElementById('modal-desc').textContent = article.description || '';
    const modalLink = document.getElementById('modal-link');
    modalLink.href = article.url || '#';
    modalLink.onclick = function() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    };
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}
function setupModalClose() {
    const modal = document.getElementById('news-modal');
    const closeBtn = document.getElementById('news-modal-close');
    if (!modal || !closeBtn) return;
    closeBtn.onclick = function() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    };
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    };
}
function updatePagination(totalPages, startIndex, endIndex, totalArticles) {
    const paginationContainer = document.getElementById('pagination-container');
    const paginationInfo = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const pageNumbers = document.getElementById('page-numbers');
    if (!paginationContainer || !paginationInfo || !prevBtn || !nextBtn || !pageNumbers) return;
    paginationContainer.style.display = 'flex';
    paginationInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalArticles} articles`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    pageNumbers.innerHTML = '';
    
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = createPageButton(i, i === currentPage);
            pageNumbers.appendChild(pageBtn);
        }
    } else {
        if (currentPage <= 4) {
            for (let i = 1; i <= 5; i++) {
                const pageBtn = createPageButton(i, i === currentPage);
                pageNumbers.appendChild(pageBtn);
            }
            pageNumbers.appendChild(createDotsElement());
            const lastPageBtn = createPageButton(totalPages, false);
            pageNumbers.appendChild(lastPageBtn);
        } else if (currentPage >= totalPages - 3) {
            const firstPageBtn = createPageButton(1, false);
            pageNumbers.appendChild(firstPageBtn);
            pageNumbers.appendChild(createDotsElement());
            for (let i = totalPages - 4; i <= totalPages; i++) {
                const pageBtn = createPageButton(i, i === currentPage);
                pageNumbers.appendChild(pageBtn);
            }
        } else {
            const firstPageBtn = createPageButton(1, false);
            pageNumbers.appendChild(firstPageBtn);
            pageNumbers.appendChild(createDotsElement());
            for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                const pageBtn = createPageButton(i, i === currentPage);
                pageNumbers.appendChild(pageBtn);
            }
            pageNumbers.appendChild(createDotsElement());
            const lastPageBtn = createPageButton(totalPages, false);
            pageNumbers.appendChild(lastPageBtn);
        }
    }
}
function createPageButton(pageNum, isActive) {
    const button = document.createElement('button');
    button.className = `page-number ${isActive ? 'active' : ''}`;
    button.textContent = pageNum;
    button.addEventListener('click', () => {
        currentPage = pageNum;
        setPageInURL(pageNum);
        displayCurrentPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return button;
}
function createDotsElement() {
    const dots = document.createElement('span');
    dots.className = 'page-number dots';
    dots.textContent = '...';
    return dots;
}
function setupPaginationEventListeners() {
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                setPageInURL(currentPage);
                displayCurrentPage();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
            if (currentPage < totalPages) {
                currentPage++;
                setPageInURL(currentPage);
                displayCurrentPage();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
}
document.addEventListener('DOMContentLoaded', function() {
  const header = document.querySelector('header');
  const nav = document.querySelector('nav');
  const container = document.querySelector('.container');
  const navHeight = nav.offsetHeight;

  function onScroll() {
    const headerRect = header.getBoundingClientRect();
    if (headerRect.bottom <= 0) {
      nav.classList.add('fixed-nav');
      container.style.paddingTop = navHeight + 'px';
    } else {
      nav.classList.remove('fixed-nav');
      container.style.paddingTop = '';
    }
  }

  window.addEventListener('scroll', onScroll);
});