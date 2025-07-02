const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = "your_newsapi_key_here"; // 🔁 Replace with your actual API key

app.use(cors());

app.get("/news", async (req, res) => {
    const { query = "general", page = 1 } = req.query;
    const url = `https://newsapi.org/v2/top-headlines?category=${query}&language=en&pageSize=100&page=${page}&apiKey=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Server error", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server is running at http://localhost:${PORT}`);
});
