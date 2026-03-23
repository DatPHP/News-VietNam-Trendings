import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  MapPin, 
  Cpu, 
  Globe, 
  Clock, 
  ChevronRight, 
  ExternalLink,
  Coins,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const queryClient = new QueryClient();

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  thumbnail?: string;
}

interface NewsData {
  gold: NewsItem[];
  travel: NewsItem[];
  tech: NewsItem[];
  economy: NewsItem[];
  lastUpdated: string | null;
}

const NewsCard: React.FC<{ item: NewsItem; index: number }> = ({ item, index }) => {
  return (
    <motion.a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-400 transition-all duration-300 shadow-sm hover:shadow-md"
    >
      {item.thumbnail && (
        <div className="aspect-video overflow-hidden">
          <img 
            src={item.thumbnail} 
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {new Date(item.pubDate).toLocaleDateString('vi-VN')}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-zinc-900 line-clamp-2 group-hover:text-emerald-600 transition-colors mb-2">
          {item.title}
        </h3>
        <p className="text-xs text-zinc-500 line-clamp-3 mb-4 flex-grow">
          {item.content}
        </p>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100">
          <span className="text-[10px] font-medium text-zinc-400 flex items-center gap-1">
            <Clock size={10} />
            VnExpress
          </span>
          <ExternalLink size={12} className="text-zinc-300 group-hover:text-emerald-500 transition-colors" />
        </div>
      </div>
    </motion.a>
  );
};

function NewsSection() {
  const [activeTab, setActiveTab] = useState<'gold' | 'travel' | 'tech' | 'economy'>('economy');

  const { data, isLoading, isError, refetch, isFetching } = useQuery<NewsData>({
    queryKey: ['news'],
    queryFn: async () => {
      console.log("Fetching news...");
      const res = await fetch(`/api/news?t=${Date.now()}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      console.log("News data received:", json);
      
      // Kiểm tra dữ liệu hợp lệ
      if (!json || typeof json !== 'object') {
        throw new Error("Invalid data format received from server");
      }
      
      return json;
    },
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
  });

  const tabs = [
    { id: 'economy', label: 'Kinh tế & Chính trị', icon: Globe },
    { id: 'tech', label: 'Công nghệ & Xu hướng', icon: Cpu },
    { id: 'travel', label: 'Du lịch & Ẩm thực', icon: MapPin },
    { id: 'gold', label: 'Giá vàng & Tài chính', icon: Coins },
  ] as const;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="animate-spin text-emerald-500" size={32} />
        <p className="text-zinc-500 font-medium animate-pulse">Đang tải tin tức mới nhất...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-500 font-medium">Có lỗi xảy ra khi tải dữ liệu.</p>
        <button 
          onClick={() => refetch()}
          className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const currentNews = data?.[activeTab] || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Live Updates
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 mb-2">
            VN NEWS <span className="text-emerald-600">TRENDS</span>
          </h1>
          <p className="text-zinc-500 max-w-md text-sm">
            Tổng hợp tin tức hàng đầu từ các nguồn uy tín tại Việt Nam. Cập nhật tự động mỗi 10 phút.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {data?.lastUpdated && (
            <span className="text-[10px] font-mono text-zinc-400">
              Cập nhật lần cuối: {new Date(data.lastUpdated).toLocaleTimeString('vi-VN')}
            </span>
          )}
          <button 
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-full text-xs font-bold hover:border-zinc-900 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
            LÀM MỚI
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 mb-8 border-b border-zinc-100 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all",
                isActive 
                  ? "bg-zinc-900 text-white shadow-lg shadow-zinc-200" 
                  : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="wait">
          {currentNews.length > 0 ? (
            currentNews.map((item, idx) => (
              <NewsCard key={item.link} item={item} index={idx} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-zinc-400 italic">Hiện chưa có tin tức nào trong mục này.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <footer className="mt-20 pt-8 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
        <span>© 2026 VN NEWS TRENDS</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-zinc-900 transition-colors">Về chúng tôi</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">Điều khoản</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">Liên hệ</a>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#FDFDFD] text-zinc-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
        <NewsSection />
      </div>
    </QueryClientProvider>
  );
}
