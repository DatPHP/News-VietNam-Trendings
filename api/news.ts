import express from "express";
import path from "path";
import axios from "axios";
import Parser from "rss-parser";

const app = express();
const parser = new Parser();

// Cache object (In serverless, this is temporary but works for the request)
let newsCache: any = {
  gold: [],
  travel: [],
  tech: [],
  economy: [],
  lastUpdated: null
};

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

async function getNewsData() {
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

    return {
      gold: goldPrices,
      travel: processItems(travelFeed.items, "travel"),
      tech: processItems(techFeed.items, "tech"),
      economy: processItems([...economyFeed.items, ...worldFeed.items].sort((a, b) => new Date(b.pubDate!).getTime() - new Date(a.pubDate!).getTime()), "economy"),
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error("Error fetching news:", error);
    return newsCache;
  }
}

app.get("/api/news", async (req, res) => {
  const data = await getNewsData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
  res.json(data);
});

export default app;
