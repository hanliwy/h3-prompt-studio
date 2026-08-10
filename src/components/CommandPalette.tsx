import React, { useState, useEffect } from 'react';
import { 
  Command, 
  Search, 
  Sparkles, 
  Layers, 
  LayoutGrid, 
  History, 
  Key, 
  PlusCircle, 
  X 
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: 'generator' | 'skills' | 'gallery' | 'history') => void;
  onOpenKeyModal: () => void;
  onOpenAddModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenKeyModal,
  onOpenAddModal,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger handled parent level
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'gen',
      title: '转到 DeepSeek 视频提示词生成器',
      subtitle: '支持一键生成 MiniMax-H3 / Sora / Runway 语法',
      icon: Sparkles,
      action: () => {
        onNavigate('generator');
        onClose();
      },
    },
    {
      id: 'skills',
      title: '查看 MiniMax-H3 技能规则库',
      subtitle: 'IMAX大片、赛博朋克、人像特写、动漫云海等预设',
      icon: Layers,
      action: () => {
        onNavigate('skills');
        onClose();
      },
    },
    {
      id: 'gallery',
      title: '浏览 OpenPrompt 风格灵感画廊',
      subtitle: '点击案例弹窗 Side Drawer 查看运镜与完整 Prompt',
      icon: LayoutGrid,
      action: () => {
        onNavigate('gallery');
        onClose();
      },
    },
    {
      id: 'history',
      title: '查看提示词追溯历史记录',
      subtitle: '全记录检索、收藏与导出 Markdown',
      icon: History,
      action: () => {
        onNavigate('history');
        onClose();
      },
    },
    {
      id: 'key',
      title: '通用 API 与中转渠道设置',
      subtitle: '设置 Base URL、API 密钥、保存多渠道配置及指定带前缀的自定义模型',
      icon: Key,
      action: () => {
        onOpenKeyModal();
        onClose();
      },
    },
    {
      id: 'add',
      title: '上传/录入自建灵感作品',
      subtitle: '将本地生成的视频或图片加入私有灵感画廊',
      icon: PlusCircle,
      action: () => {
        onOpenAddModal();
        onClose();
      },
    },
  ];

  const filteredActions = actions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Search input header */}
        <div className="flex items-center px-4 py-3 bg-slate-950 border-b border-slate-800 gap-3">
          <Search className="w-4 h-4 text-cyan-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="键入命令或检索关键词 (例如: 生成器, 画廊, Key)..."
            className="flex-1 bg-transparent text-xs text-slate-100 focus:outline-none font-sans"
          />
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action list */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredActions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="w-full p-3 rounded-xl hover:bg-slate-800/80 transition-colors flex items-center gap-3 text-left group"
              >
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400 group-hover:border-cyan-500/60 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-slate-200">{item.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
