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
  // Source 1: SJC XML
  try {
    const response = await axios.get("https://sjc.com.vn/xml/tygiavang.xml", {
      timeout: 5000,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const xml = response.data;
    const sjcRegex = /<item\s+[^>]*type="([^"]+)"\s+[^>]*buy="([^"]+)"\s+[^>]*sell="([^"]+)"/gi;
    const results = [];
    let match;
    while ((match = sjcRegex.exec(xml)) !== null) {
      const [_, type, buy, sell] = match;
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
    if (results.length > 0) return results;
  } catch (e) {
    console.warn("SJC Source failed");
  }

  // Source 2: Tygia.com
  try {
    const response = await axios.get("https://tygia.com/json.php?ran=0&gold=1&bank=1&date=now", {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (response.data && response.data.golds) {
      const goldData = response.data.golds[0]?.value || [];
      return goldData.filter((g: any) => g.type.includes("SJC")).slice(0, 10).map((g: any) => ({
        title: `Vàng ${g.type}`,
        link: "https://tygia.com",
        pubDate: new Date().toISOString(),
        content: `Giá vàng ${g.type} - Mua vào: ${g.buy} triệu/lượng, Bán ra: ${g.sell} triệu/lượng.`,
        thumbnail: "https://picsum.photos/seed/gold-price/400/300"
      }));
    }
  } catch (e) {}

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

    return {
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
