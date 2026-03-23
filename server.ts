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
  // Nguồn 1: API Bảo Tín Minh Châu (Rất ổn định)
  try {
    const response = await axios.get("https://api.btmc.vn/api/v1/get-gold-price?key=3088da80-38b7-11eb-adc1-0242ac120002", {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (response.data && response.data.data) {
      return response.data.data.map((item: any) => ({
        title: `Vàng ${item.name}`,
        link: "https://btmc.vn",
        pubDate: new Date().toISOString(),
        content: `Giá vàng ${item.name} - Mua vào: ${item.buy} - Bán ra: ${item.sell} (Đơn vị: VNĐ/lượng)`,
        thumbnail: "https://picsum.photos/seed/gold-btmc/400/300"
      }));
    }
  } catch (e) {
    console.warn("BTMC API failed, trying fallback...");
  }

  // Nguồn 2: Tygia.com (Dự phòng)
  try {
    const response = await axios.get("https://tygia.com/json.php?ran=0&gold=1&bank=1&date=now", {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (response.data && response.data.golds) {
      const goldData = response.data.golds[0]?.value || [];
      return goldData.slice(0, 10).map((g: any) => ({
        title: `Vàng ${g.type}`,
        link: "https://tygia.com",
        pubDate: new Date().toISOString(),
        content: `Giá vàng ${g.type} - Mua vào: ${g.buy} triệu/lượng, Bán ra: ${g.sell} triệu/lượng.`,
        thumbnail: "https://picsum.photos/seed/gold-price/400/300"
      }));
    }
  } catch (e) {
    console.warn("Tygia Source failed");
  }

  return [];
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

    const processItems = (items: any[], seed: string) => items.slice(0, 12).map(item => {
      const imgMatch = item.content?.match(/src="([^"]+)"/);
      const thumbnail = imgMatch ? imgMatch[1] : `https://picsum.photos/seed/${seed}-${Math.random()}/400/300`;
      return {
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        content: item.contentSnippet?.split('\n')[0] || "Xem chi tiết bản tin...",
        thumbnail: thumbnail
      };
    });

    newsCache = {
      gold: goldPrices,
      travel: processItems(travelFeed.items, "travel"),
      tech: processItems(techFeed.items, "tech"),
      economy: processItems([...economyFeed.items, ...worldFeed.items].sort((a, b) => new Date(b.pubDate!).getTime() - new Date(a.pubDate!).getTime()), "economy"),
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
