import React from 'react';
import { 
  Sparkles, 
  Film, 
  LayoutGrid, 
  History, 
  PlusCircle, 
  Key, 
  Cpu, 
  Command, 
  Bot,
  Zap,
  Layers
} from 'lucide-react';
import { DeepSeekSettings } from '../types';

interface NavbarProps {
  activeTab: 'generator' | 'skills' | 'gallery' | 'history';
  setActiveTab: (tab: 'generator' | 'skills' | 'gallery' | 'history') => void;
  openKeyModal: () => void;
  openAddModal: () => void;
  openCommandPalette: () => void;
  settings: DeepSeekSettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openKeyModal,
  openAddModal,
  openCommandPalette,
  settings,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 text-slate-100">
      {/* Top Windows App-style decorative bar */}
      <div className="bg-slate-900/90 text-xs text-slate-400 px-4 py-1 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[11px] tracking-wide text-slate-300">Creative Prompt Studio · Image & Video</span>
          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-cyan-400 border border-slate-700">Windows Local Edition</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={openCommandPalette}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition-colors text-[11px]"
            title="打开快捷命令面板 (Ctrl+K)"
          >
            <Command className="w-3 h-3 text-cyan-400" />
            <span className="font-mono">Ctrl+K</span>
          </button>
          
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
            <Cpu className="w-3 h-3 text-purple-400" />
            <span className="max-w-[150px] truncate">{settings.model || 'deepseek-v4-flash'}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${settings.apiKey ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </div>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:flex-nowrap sm:px-6">
        {/* Brand Logo */}
        <div className="flex min-w-0 items-center gap-3 cursor-pointer" onClick={() => setActiveTab('generator')}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Film className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white p-0.5 rounded-full">
              <Zap className="w-2.5 h-2.5" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-bold text-base tracking-tight bg-gradient-to-r from-cyan-300 via-sky-200 to-purple-300 bg-clip-text text-transparent">
                创意提示词工作室
              </h1>
              <span className="hidden shrink-0 rounded-full border border-cyan-800/60 bg-cyan-950/80 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 lg:inline">
                LLM / DeepSeek 驱动
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans hidden sm:block">
              图片与视频提示词生成、Skill 工作流与灵感画廊
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/90 p-1 sm:order-none sm:w-auto">
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex shrink-0 items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'generator'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>提示词生成</span>
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`flex shrink-0 items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'skills'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-300" />
            <span>技能预设库</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex shrink-0 items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'gallery'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-300" />
            <span>灵感画廊</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex shrink-0 items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-300" />
            <span>历史追溯</span>
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={openAddModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/70 transition-all hover:border-cyan-500/50"
            title="上传/添加本地灵感作品到画廊"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>自建灵感</span>
          </button>

          <button
            onClick={openKeyModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              settings.apiKey
                ? 'bg-slate-900 text-slate-200 border-slate-700/80 hover:bg-slate-800'
                : 'bg-amber-950/60 text-amber-300 border-amber-800/80 hover:bg-amber-900/80 animate-pulse'
            }`}
            title="配置通用 API Key 与中转渠道"
          >
            <Key className={`w-3.5 h-3.5 ${settings.apiKey ? 'text-cyan-400' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">
              {settings.apiKey ? 'API 渠道已就绪' : '通用 API 设置'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
