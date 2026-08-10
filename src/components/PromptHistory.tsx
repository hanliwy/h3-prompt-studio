import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  Star, 
  Download, 
  Film, 
  Cpu, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { PromptHistoryItem, GalleryItem } from '../types';

interface PromptHistoryProps {
  historyItems: PromptHistoryItem[];
  onToggleFavoriteHistory: (id: string) => void;
  onDeleteHistory: (id: string) => void;
  onClearAllHistory: () => void;
  onSendToGenerator: (item: PromptHistoryItem) => void;
}

export const PromptHistory: React.FC<PromptHistoryProps> = ({
  historyItems,
  onToggleFavoriteHistory,
  onDeleteHistory,
  onClearAllHistory,
  onSendToGenerator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedThinkingId, setExpandedThinkingId] = useState<string | null>(null);

  const filteredItems = historyItems.filter((item) => {
    const matchesFav = !onlyFavorites || item.isFavorite;
    const matchesSearch =
      item.userQuery.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.structuredOutput.englishPrompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.structuredOutput.chineseTranslation.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFav && matchesSearch;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportMarkdown = () => {
    let md = `# MiniMax-H3 x DeepSeek 视频提示词历史导出的集锦\n\n`;
    filteredItems.forEach((item, index) => {
      md += `## ${index + 1}. ${item.structuredOutput.title || item.userQuery}\n`;
      md += `- **生成时间**: ${item.createdAt}\n`;
      md += `- **调用模型**: ${item.modelUsed}\n\n`;
      md += `### 英文 Prompt:\n\`\`\`\n${item.structuredOutput.englishPrompt}\n\`\`\`\n\n`;
      md += `### 中文释义:\n> ${item.structuredOutput.chineseTranslation}\n\n`;
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `minimax-h3-prompts-history-${Date.now()}.md`;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">提示词生成追溯记录</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
              共 {historyItems.length} 条记录
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            自动记录每次通过 DeepSeek 生成的物理运动、镜号与音效 Prompt，支持一键复用与导出 Markdown
          </p>
        </div>

        {/* Search, Filter & Bulk Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索历史提示词..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
              onlyFavorites
                ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
            <span>收藏夹</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            disabled={filteredItems.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>导出 Markdown</span>
          </button>

          {historyItems.length > 0 && (
            <button
              onClick={onClearAllHistory}
              className="px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/50 border border-slate-800 transition-colors"
              title="清空所有历史"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
          <History className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">暂无历史追溯记录</h3>
          <p className="text-xs text-slate-500">在生成器中一键生成你的第一个视频提示词</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 hover:border-slate-700 transition-all"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-cyan-400 font-bold">
                      {item.createdAt}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                      {item.modelUsed}
                    </span>
                    {item.gavenStyleCodes && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-800/70">
                        画风: {item.gavenStyleCodes}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-100">
                    需求: "{item.userQuery}"
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleFavoriteHistory(item.id)}
                    className={`p-1.5 rounded-lg border transition-all ${
                      item.isFavorite
                        ? 'bg-amber-950/80 border-amber-800 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={() => onDeleteHistory(item.id)}
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Master English Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1">
                    <Film className="w-3.5 h-3.5" />
                    <span>英文主提示词</span>
                  </span>

                  <button
                    onClick={() => handleCopy(item.structuredOutput.englishPrompt, item.id)}
                    className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                  >
                    {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === item.id ? '已复制' : '复制 Prompt'}</span>
                  </button>
                </div>

                <p className="text-xs font-mono text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800 select-all">
                  {item.structuredOutput.englishPrompt}
                </p>
              </div>

              {/* Chinese Translation */}
              <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {item.structuredOutput.chineseTranslation}
              </p>

              {/* Optional Thinking Process Toggle */}
              {item.thinkingProcess && (
                <div>
                  <button
                    onClick={() =>
                      setExpandedThinkingId(expandedThinkingId === item.id ? null : item.id)
                    }
                    className="text-[11px] text-purple-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <Cpu className="w-3 h-3" />
                    <span>
                      {expandedThinkingId === item.id ? '隐藏 DeepSeek 思考过程' : '查看 DeepSeek 思考过程'}
                    </span>
                  </button>

                  {expandedThinkingId === item.id && (
                    <div className="mt-2 p-3 rounded-xl bg-purple-950/30 border border-purple-900/40 text-[11px] font-mono text-purple-200/90 whitespace-pre-wrap">
                      {item.thinkingProcess}
                    </div>
                  )}
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <div className="text-[11px] text-slate-400 font-mono">
                  运镜: {item.structuredOutput.cameraMovement}
                </div>

                <button
                  onClick={() => onSendToGenerator(item)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 transition-all text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>在生成器中二次修改</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
