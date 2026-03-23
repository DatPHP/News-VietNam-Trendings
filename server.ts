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
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const xml = response.data;
    
    // Regex to find SJC items
    const sjcRegex = /<item[^>]*type="([^"]*)"[^>]*buy="([^"]*)"[^>]*sell="([^"]*)"/g;
    const results = [];
    let match;
    
    while ((match = sjcRegex.exec(xml)) !== null) {
      const [_, type, buy, sell] = match;
      if (type.includes("SJC")) {
        results.push({
          title: `Vàng ${type}`,
          description: `Mua vào: ${buy} - Bán ra: ${sell} (Triệu VNĐ/lượng)`,
          link: "https://sjc.com.vn",
          pubDate: new Date().toISOString(),
          content: `Giá vàng ${type} cập nhật mới nhất từ SJC. Mua vào: ${buy}, Bán ra: ${sell}.`
        });
      }
    }
    
    return results.length > 0 ? results : [{ 
      title: "Giá vàng SJC", 
      description: "Cập nhật từ SJC", 
      link: "https://sjc.com.vn",
      pubDate: new Date().toISOString(),
      content: "Vui lòng truy cập website SJC để xem chi tiết."
    }];
  } catch (error) {
    console.error("Error fetching gold prices:", error);
    return [];
  }
}

async function fetchNews() {
  try {
    const [travelFeed, techFeed, economyFeed] = await Promise.all([
      parser.parseURL("https://vnexpress.net/rss/du-lich.rss"),
      parser.parseURL("https://vnexpress.net/rss/so-hoa.rss"),
      parser.parseURL("https://vnexpress.net/rss/kinh-doanh.rss")
    ]);

    newsCache = {
      gold: await fetchGoldPrices(), // Placeholder for now
      travel: travelFeed.items.slice(0, 10).map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        content: item.contentSnippet,
        thumbnail: item.content?.match(/src="([^"]+)"/)?.[1] || ""
      })),
      tech: techFeed.items.slice(0, 10).map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        content: item.contentSnippet,
        thumbnail: item.content?.match(/src="([^"]+)"/)?.[1] || ""
      })),
      economy: economyFeed.items.slice(0, 10).map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        content: item.contentSnippet,
        thumbnail: item.content?.match(/src="([^"]+)"/)?.[1] || ""
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
  res.json(newsCache);
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
