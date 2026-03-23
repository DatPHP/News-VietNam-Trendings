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
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  thumbnail: string;
  source: string;
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
      className="group flex flex-col bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5"
    >
      <div className="aspect-video overflow-hidden relative">
        <img 
          src={item.thumbnail} 
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${index}/600/400`;
          }}
        />
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-md border border-white/10">
            {item.source}
          </span>
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={12} className="text-zinc-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {new Date(item.pubDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(item.pubDate).toLocaleDateString('vi-VN')}
          </span>
        </div>
        
        <h3 className="text-base font-bold text-zinc-900 line-clamp-2 group-hover:text-emerald-600 transition-colors mb-3 leading-tight">
          {item.title}
        </h3>
        
        <p className="text-xs text-zinc-500 line-clamp-3 mb-6 leading-relaxed">
          {item.content}
        </p>
        
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-100">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1">
            Đọc tiếp <ChevronRight size={10} />
          </span>
          <ExternalLink size={14} className="text-zinc-300 group-hover:text-emerald-500 transition-colors" />
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
      const res = await fetch(`/api/news?nocache=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    },
    refetchInterval: 10 * 60 * 1000,
  });

  const tabs = [
    { id: 'economy', label: 'Kinh tế & Chính trị', icon: Globe, color: 'emerald' },
    { id: 'tech', label: 'Công nghệ & Xu hướng', icon: Cpu, color: 'blue' },
    { id: 'travel', label: 'Du lịch & Ẩm thực', icon: MapPin, color: 'orange' },
    { id: 'gold', label: 'Giá vàng & Tài chính', icon: Coins, color: 'yellow' },
  ] as const;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="relative">
          <RefreshCw className="animate-spin text-emerald-500" size={48} />
          <div className="absolute inset-0 blur-xl bg-emerald-500/20 animate-pulse rounded-full" />
        </div>
        <div className="text-center">
          <p className="text-zinc-900 font-black text-xl tracking-tighter uppercase">Đang đồng bộ dữ liệu...</p>
          <p className="text-zinc-400 text-xs font-medium mt-1">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
          <AlertCircle className="text-red-500" size={32} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">KHÔNG THỂ KẾT NỐI MÁY CHỦ</h2>
          <p className="text-zinc-500 text-sm mt-2 max-w-xs mx-auto">
            Hệ thống đang gặp sự cố khi lấy tin tức mới nhất. Vui lòng thử lại sau.
          </p>
        </div>
        <button 
          onClick={() => refetch()}
          className="px-8 py-3 bg-zinc-900 text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-emerald-600 transition-all shadow-lg shadow-zinc-200"
        >
          Thử lại ngay
        </button>
      </div>
    );
  }

  const currentNews = data?.[activeTab] || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <header className="mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
              Hệ thống cập nhật thời gian thực
            </span>
          </div>
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-zinc-900 leading-[0.9]">
            VN NEWS <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">TRENDINGS</span>
          </h1>
          <p className="text-zinc-500 max-w-md text-sm mt-6 font-medium leading-relaxed">
            Nền tảng tổng hợp tin tức thông minh, tự động phân tích và cập nhật từ các nguồn báo chí hàng đầu Việt Nam.
          </p>
        </div>
        
        <div className="flex flex-col items-start lg:items-end gap-4">
          {data?.lastUpdated && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-100">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Cập nhật: {new Date(data.lastUpdated).toLocaleTimeString('vi-VN')}
              </span>
            </div>
          )}
          <button 
            onClick={() => refetch()}
            disabled={isFetching}
            className="group flex items-center gap-3 px-6 py-3 bg-zinc-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-zinc-200 disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
            Làm mới dữ liệu
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-3 mb-12 sticky top-4 z-50 bg-white/80 backdrop-blur-xl p-2 rounded-2xl border border-zinc-100 shadow-xl shadow-zinc-500/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                isActive 
                  ? "bg-zinc-900 text-white shadow-xl shadow-zinc-300 scale-105" 
                  : "bg-transparent text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <AnimatePresence mode="wait">
          {currentNews.length > 0 ? (
            currentNews.map((item, idx) => (
              <NewsCard key={`${item.link}-${idx}`} item={item} index={idx} />
            ))
          ) : (
            <div className="col-span-full py-32 text-center bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm">Chưa có dữ liệu mới cho mục này</p>
              <p className="text-zinc-300 text-xs mt-2">Vui lòng quay lại sau ít phút</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <footer className="mt-32 pt-12 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-8 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">
        <div className="flex flex-col gap-2">
          <span>© 2026 VN NEWS TRENDINGS</span>
          <span className="text-zinc-300">Powered by AI Analytics</span>
        </div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-emerald-600 transition-colors">Về chúng tôi</a>
          <a href="#" className="hover:text-emerald-600 transition-colors">Điều khoản</a>
          <a href="#" className="hover:text-emerald-600 transition-colors">Liên hệ</a>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
        <NewsSection />
      </div>
    </QueryClientProvider>
  );
}
