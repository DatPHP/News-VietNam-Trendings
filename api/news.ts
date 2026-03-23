import express from "express";
import axios from "axios";
import Parser from "rss-parser";

const app = express();
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  },
  timeout: 8000
});

// --- CẤU TRÚC DỮ LIỆU CHUẨN ---
interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  thumbnail: string;
  source: string;
}

// --- BỘ XỬ LÝ RSS THÔNG MINH ---
async function fetchRSS(urls: string[], category: string, fallbackSeed: string): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];
  
  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      const processed = feed.items.map(item => {
        // Trích xuất ảnh từ description hoặc content:encoded
        const rawContent = (item.content || item.description || "");
        const imgMatch = rawContent.match(/src="([^"]+)"/);
        let thumbnail = imgMatch ? imgMatch[1] : "";
        
        // Nếu không có ảnh, dùng ảnh placeholder theo chủ đề
        if (!thumbnail || thumbnail.includes("feedburner")) {
          thumbnail = `https://picsum.photos/seed/${fallbackSeed}-${Math.random()}/600/400`;
        }

        return {
          title: item.title?.trim() || "Bản tin không tiêu đề",
          link: item.link || "#",
          pubDate: item.pubDate || new Date().toISOString(),
          content: (item.contentSnippet || item.description || "")
            .replace(/<[^>]*>?/gm, '') // Xóa HTML tags
            .replace(/&nbsp;/g, ' ')
            .trim()
            .substring(0, 160) + "...",
          thumbnail: thumbnail,
          source: feed.title || "Tin tức Việt Nam"
        };
      });
      allItems.push(...processed);
    } catch (error) {
      console.error(`Lỗi khi lấy RSS từ ${url}:`, error);
    }
  }
  
  // Sắp xếp theo thời gian mới nhất và lấy top 15
  return allItems
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 15);
}

// --- BỘ XỬ LÝ GIÁ VÀNG ĐA NGUỒN ---
async function fetchGoldPrices(): Promise<NewsItem[]> {
  const sources = [
    {
      name: "Bảo Tín Minh Châu",
      url: "https://api.btmc.vn/api/v1/get-gold-price?key=3088da80-38b7-11eb-adc1-0242ac120002",
      process: (data: any) => data.data?.map((g: any) => ({
        title: `Vàng ${g.name}`,
        link: "https://btmc.vn",
        pubDate: new Date().toISOString(),
        content: `MUA: ${g.buy} - BÁN: ${g.sell} (VNĐ/lượng). Cập nhật từ Bảo Tín Minh Châu.`,
        thumbnail: "https://picsum.photos/seed/gold-btmc/600/400",
        source: "BTMC"
      }))
    },
    {
      name: "Tỷ Giá VN",
      url: "https://tygia.com/json.php?ran=0&gold=1&bank=1&date=now",
      process: (data: any) => data.golds?.[0]?.value?.map((g: any) => ({
        title: `Vàng ${g.type}`,
        link: "https://tygia.com",
        pubDate: new Date().toISOString(),
        content: `MUA: ${g.buy} - BÁN: ${g.sell} (Triệu/lượng). Dữ liệu thị trường tự do.`,
        thumbnail: "https://picsum.photos/seed/gold-market/600/400",
        source: "Tygia.com"
      }))
    }
  ];

  for (const source of sources) {
    try {
      const res = await axios.get(source.url, { timeout: 5000 });
      const processed = source.process(res.data);
      if (processed && processed.length > 0) return processed;
    } catch (e) {
      console.warn(`Nguồn vàng ${source.name} thất bại, thử nguồn tiếp theo...`);
    }
  }
  
  return [];
}

// --- API ENDPOINT CHÍNH ---
app.get("/api/news", async (req, res) => {
  // Ép vô hiệu hóa cache ở mọi cấp độ
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  try {
    // Lấy dữ liệu song song nhưng xử lý lỗi độc lập
    const [gold, economy, tech, travel] = await Promise.all([
      fetchGoldPrices(),
      fetchRSS([
        "https://vnexpress.net/rss/kinh-doanh.rss",
        "https://tuoitre.vn/rss/kinh-doanh.rss"
      ], "economy", "business"),
      fetchRSS([
        "https://vnexpress.net/rss/so-hoa.rss",
        "https://thanhnien.vn/rss/cong-nghe-game.rss"
      ], "tech", "technology"),
      fetchRSS([
        "https://vnexpress.net/rss/du-lich.rss",
        "https://tuoitre.vn/rss/du-lich.rss"
      ], "travel", "travel")
    ]);

    res.json({
      gold,
      economy,
      tech,
      travel,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("Lỗi hệ thống API:", error);
    res.status(500).json({ 
      error: "Không thể tải dữ liệu",
      gold: [], economy: [], tech: [], travel: [],
      lastUpdated: new Date().toISOString()
    });
  }
});

export default app;
