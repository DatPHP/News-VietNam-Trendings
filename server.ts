import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import Parser from "rss-parser";

const app = express();
const PORT = 3000;
const parser = new Parser();

// Cache object
let newsCache: any = {
  gold: [],
  travel: [],
  tech: [],
  economy: [],
  lastUpdated: null
};

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

async function fetchGoldPrices() {
  try {
    const response = await axios.get("https://sjc.com.vn/xml/tygiavang.xml", {
      timeout: 8000,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/xml, text/xml, */*'
      }
    });
    const xml = response.data;
    
    // More robust regex for SJC XML
    const sjcRegex = /<item\s+[^>]*type="([^"]+)"\s+[^>]*buy="([^"]+)"\s+[^>]*sell="([^"]+)"/gi;
    const results = [];
    let match;
    
    while ((match = sjcRegex.exec(xml)) !== null) {
      const [_, type, buy, sell] = match;
      // Filter for main SJC types to keep it clean
      if (type.includes("SJC") || type.includes("Nhẫn")) {
        results.push({
          title: `Vàng ${type}`,
          link: "https://sjc.com.vn",
          pubDate: new Date().toISOString(),
          content: `Giá vàng ${type} - Mua vào: ${buy} triệu/lượng, Bán ra: ${sell} triệu/lượng.`,
          thumbnail: "https://picsum.photos/seed/gold/400/300"
        });
      }
    }

    // Add some general finance/gold news from RSS as fallback/supplement
    try {
      const financeFeed = await parser.parseURL("https://vnexpress.net/rss/kinh-doanh.rss");
      const goldNews = financeFeed.items
        .filter(item => item.title?.toLowerCase().includes("vàng") || item.contentSnippet?.toLowerCase().includes("vàng"))
        .slice(0, 5)
        .map(item => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          content: item.contentSnippet,
          thumbnail: item.content?.match(/src="([^"]+)"/)?.[1] || "https://picsum.photos/seed/finance/400/300"
        }));
      results.push(...goldNews);
    } catch (e) {
      console.error("Error fetching supplemental gold news:", e);
    }
    
    return results.sort((a, b) => new Date(b.pubDate!).getTime() - new Date(a.pubDate!).getTime()).slice(0, 10);
  } catch (error) {
    console.error("Error fetching gold prices from SJC:", error);
    return [];
  }
}

async function fetchNews() {
  try {
    const [travelFeed, techFeed, economyFeed, worldFeed] = await Promise.all([
      parser.parseURL("https://vnexpress.net/rss/du-lich.rss"),
      parser.parseURL("https://vnexpress.net/rss/so-hoa.rss"),
      parser.parseURL("https://vnexpress.net/rss/kinh-doanh.rss"),
      parser.parseURL("https://vnexpress.net/rss/the-gioi.rss")
    ]);

    const goldPrices = await fetchGoldPrices();

    newsCache = {
      gold: goldPrices,
      travel: travelFeed.items.slice(0, 10).map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        content: item.contentSnippet,
        thumbnail: item.content?.match(/src="([^"]+)"/)?.[1] || "https://picsum.photos/seed/travel/400/300"
      })),
      tech: techFeed.items.slice(0, 10).map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        content: item.contentSnippet,
        thumbnail: item.content?.match(/src="([^"]+)"/)?.[1] || "https://picsum.photos/seed/tech/400/300"
      })),
      economy: [...economyFeed.items, ...worldFeed.items]
        .sort((a, b) => new Date(b.pubDate!).getTime() - new Date(a.pubDate!).getTime())
        .slice(0, 15)
        .map(item => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          content: item.contentSnippet,
          thumbnail: item.content?.match(/src="([^"]+)"/)?.[1] || "https://picsum.photos/seed/news/400/300"
        })),
      lastUpdated: new Date()
    };
    console.log("News cache updated at:", newsCache.lastUpdated);
  } catch (error) {
    console.error("Error fetching news:", error);
  }
}

// Initial fetch
fetchNews();
// Set interval
setInterval(fetchNews, REFRESH_INTERVAL);

app.get("/api/news", (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(newsCache);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", lastUpdated: newsCache.lastUpdated });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
