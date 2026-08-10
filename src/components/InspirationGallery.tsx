import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Film,
  FolderOpen,
  Heart,
  Image as ImageIcon,
  Play,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Video,
  Zap,
} from 'lucide-react';
import { GalleryItem } from '../types';

interface InspirationGalleryProps {
  items: GalleryItem[];
  onSelectItem: (item: GalleryItem) => void;
  onToggleLike: (itemId: string) => void;
  onOpenAddModal: () => void;
  onRefreshGallery?: () => void;
}

const SOURCES = ['所有来源', 'X / Twitter', 'GitHub', '公共网页', '视频来源', '本地双轨', '扫描目录'];
const LANGUAGES = ['所有语言', 'zh', 'en'];
const MODELS = ['所有模型', 'minimax-h3', 'Seedance 2.0', 'kling-ai', 'runway-gen3', 'luma-dream', 'sora', 'pika-2', 'midjourney'];
const AUTHORS = ['所有作者', 'MiniMax Creator', 'Cinematographer_X', 'VFX Mastermind', 'NatureLover_AI', '本地创作者', '本地素材'];
const SORT_OPTIONS = ['最新收录', '最多收藏', '高分推荐'];
const INITIAL_VISIBLE_COUNT = 36;
const LOAD_MORE_COUNT = 30;

export const InspirationGallery: React.FC<InspirationGalleryProps> = ({
  items,
  onSelectItem,
  onToggleLike,
  onOpenAddModal,
  onRefreshGallery,
}) => {
  const [activeMediaType, setActiveMediaType] = useState<'video' | 'image'>('video');
  const [selectedCategory, setSelectedCategory] = useState('所有视频');
  const [selectedSource, setSelectedSource] = useState('所有来源');
  const [selectedLanguage, setSelectedLanguage] = useState('所有语言');
  const [selectedModel, setSelectedModel] = useState('所有模型');
  const [selectedAuthor, setSelectedAuthor] = useState('所有作者');
  const [selectedSort, setSelectedSort] = useState('最新收录');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLazyLoadEnabled, setIsLazyLoadEnabled] = useState(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isScanPanelOpen, setIsScanPanelOpen] = useState(false);
  const [scanDirsText, setScanDirsText] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [isSavingScanDirs, setIsSavingScanDirs] = useState(false);
  const bottomObserverRef = useRef<HTMLDivElement>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // 动态统计分类数量（基于实际数据，而非写死常量）
  const activeCategories = useMemo(() => {
    const allLabel = activeMediaType === 'video' ? '所有视频' : '所有图片';
    const typeItems = items.filter((item) => item.mediaType === activeMediaType || (!item.mediaType && activeMediaType === 'video'));
    const counts = new Map<string, number>();
    typeItems.forEach((item) => {
      const name = item.category?.trim() || '未分类';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return [
      { name: allLabel, count: typeItems.length },
      ...sorted.map(([name, count]) => ({ name, count })),
    ];
  }, [activeMediaType, items]);

  const galleryStats = useMemo(() => {
    const scannedCount = items.filter((item) => item.source === '扫描目录').length;
    const pendingPromptCount = items.filter((item) => {
      const prompt = item.promptCn || item.promptEn || '';
      return !prompt || prompt === item.title || prompt === item.titleEn;
    }).length;
    return {
      scannedCount,
      pendingPromptCount,
      videoCount: items.filter((item) => item.mediaType === 'video').length,
      imageCount: items.filter((item) => item.mediaType === 'image').length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase().trim();
    const list = items.filter((item) => {
      const matchesMediaType = item.mediaType === activeMediaType || (!item.mediaType && activeMediaType === 'video');
      const isAllCategory = selectedCategory === '所有视频' || selectedCategory === '所有图片' || selectedCategory === '全部';
      const categoryText = `${item.category} ${item.tags.join(' ')}`.toLowerCase();
      const matchesCategory = isAllCategory || categoryText.includes(selectedCategory.toLowerCase()) || selectedCategory.toLowerCase().includes(item.category.toLowerCase());
      const matchesSource = selectedSource === '所有来源' || item.source === selectedSource;
      const matchesLang = selectedLanguage === '所有语言' || item.language === selectedLanguage;
      const matchesModel = selectedModel === '所有模型' || item.targetModel?.toLowerCase() === selectedModel.toLowerCase();
      const matchesAuthor = selectedAuthor === '所有作者' || item.author === selectedAuthor;
      const matchesSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.promptEn.toLowerCase().includes(q) ||
        item.promptCn.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        item.author?.toLowerCase().includes(q);

      return matchesMediaType && matchesCategory && matchesSource && matchesLang && matchesModel && matchesAuthor && matchesSearch;
    });

    if (selectedSort === '最多收藏') {
      return [...list].sort((a, b) => b.likesCount - a.likesCount);
    }
    if (selectedSort === '最新收录') {
      return [...list].reverse();
    }
    return list;
  }, [activeMediaType, deferredSearchQuery, items, selectedAuthor, selectedCategory, selectedLanguage, selectedModel, selectedSort, selectedSource]);

  const displayedItems = isLazyLoadEnabled ? filtered.slice(0, visibleCount) : filtered;

  useEffect(() => {
    if (!isLazyLoadEnabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || visibleCount >= filtered.length) return;
        setIsLoadingMore(true);
        window.setTimeout(() => {
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, filtered.length));
          setIsLoadingMore(false);
        }, 180);
      },
      { rootMargin: '640px 0px', threshold: 0.01 }
    );

    const current = bottomObserverRef.current;
    if (current) observer.observe(current);
    return () => observer.disconnect();
  }, [filtered.length, isLazyLoadEnabled, visibleCount]);

  useEffect(() => {
    fetch('/api/gallery/scan-dirs')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.galleryScanDirs)) {
          setScanDirsText(data.galleryScanDirs.join('\n'));
        }
      })
      .catch(() => {
        setScanMessage('读取扫描目录配置失败，将只使用默认 data/media');
      });
  }, []);

  const resetVisibleWindow = () => setVisibleCount(INITIAL_VISIBLE_COUNT);

  const handleOpenLocalFolder = async () => {
    try {
      const res = await fetch('/api/open-local-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderType: 'media' }),
      });
      const data = await res.json();
      alert(data.message || '系统正在打开本地素材目录。');
    } catch {
      alert('已触发文件夹请求，请在本地操作系统中打开项目的 data/media 目录。');
    }
  };

  const handleSaveScanDirs = async () => {
    setIsSavingScanDirs(true);
    setScanMessage('');
    const galleryScanDirs = scanDirsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/gallery/scan-dirs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          galleryScanDirs,
          galleryScanMaxDepth: 16,
          galleryScanMaxFiles: 20000,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '保存扫描目录失败');
      }
      setScanMessage(`已保存 ${data.galleryScanDirs.length} 个外部扫描目录，正在刷新画廊`);
      onRefreshGallery?.();
      resetVisibleWindow();
    } catch (error: any) {
      setScanMessage(error.message || '保存扫描目录失败');
    } finally {
      setIsSavingScanDirs(false);
    }
  };

  const handleQuickCopyPrompt = (event: React.MouseEvent, item: GalleryItem) => {
    event.stopPropagation();
    navigator.clipboard.writeText(item.promptEn || item.promptCn);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const handleResetFilters = () => {
    setSelectedCategory(activeMediaType === 'video' ? '所有视频' : '所有图片');
    setSelectedSource('所有来源');
    setSelectedLanguage('所有语言');
    setSelectedModel('所有模型');
    setSelectedAuthor('所有作者');
    setSelectedSort('最新收录');
    setSearchQuery('');
    resetVisibleWindow();
  };

  const switchMediaType = (mediaType: 'video' | 'image') => {
    setActiveMediaType(mediaType);
    setSelectedCategory(mediaType === 'video' ? '所有视频' : '所有图片');
    resetVisibleWindow();
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f6_100%)] text-slate-950">
      <div className="mx-auto max-w-[1920px] px-1.5 sm:px-3 py-3 space-y-3">
        <div className="sticky top-0 z-20 -mx-1.5 grid grid-cols-1 items-center gap-3 border-b border-white/70 bg-[#f6f7f9]/90 px-1.5 py-2 backdrop-blur-xl sm:-mx-3 sm:px-3 xl:grid-cols-[260px_minmax(420px,760px)_1fr]">
          <div className="flex items-center gap-2 px-1">
            <div className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 bg-white text-[11px] font-black shadow-sm">H3</div>
            <div>
              <h1 className="text-sm font-black leading-tight">H3 Prompt Gallery</h1>
              <p className="text-[11px] font-semibold text-slate-500">图片 + 视频提示词图库</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                resetVisibleWindow();
              }}
              placeholder="搜索图片、视频、提示词、风格、产品、创作者..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-16 text-sm font-medium text-slate-900 shadow-[0_12px_40px_rgba(15,23,42,0.08)] outline-none placeholder:text-slate-400 focus:border-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  resetVisibleWindow();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                清除
              </button>
            )}
          </div>

          <div className="flex items-center justify-start xl:justify-end gap-1.5 overflow-x-auto">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black shadow-sm">{items.length.toLocaleString()} 记录</span>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black shadow-sm">{galleryStats.imageCount.toLocaleString()} 图片</span>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black shadow-sm">{galleryStats.videoCount.toLocaleString()} 视频</span>
            <button
              onClick={handleOpenLocalFolder}
              className="ml-1 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-slate-400"
              title="打开后端读取的 data/media 目录"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              data/media
            </button>
            <button
              onClick={() => setIsScanPanelOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-slate-400"
              title="配置多个外部媒体扫描目录"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              扫描目录
            </button>
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              录入
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
            <p className="text-[10px] font-black uppercase text-slate-400">扫描目录</p>
            <p className="text-sm font-black text-slate-950">{galleryStats.scannedCount.toLocaleString()} 个本地素材</p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
            <p className="text-[10px] font-black uppercase text-slate-400">待补提示词</p>
            <p className="text-sm font-black text-slate-950">{galleryStats.pendingPromptCount.toLocaleString()} 个可在详情页编辑</p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
            <p className="text-[10px] font-black uppercase text-slate-400">渲染策略</p>
            <p className="text-sm font-black text-slate-950">{isLazyLoadEnabled ? '懒加载开启' : '一次性渲染'}</p>
          </div>
        </div>

        {isScanPanelOpen && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
              <label className="space-y-1">
                <span className="text-xs font-black text-slate-500">外部画廊扫描目录，每行一个绝对路径</span>
                <textarea
                  value={scanDirsText}
                  onChange={(event) => setScanDirsText(event.target.value)}
                  className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs font-semibold leading-5 text-slate-900 outline-none focus:border-slate-400"
                  placeholder="/Volumes/output/minimax-h3&#10;/mnt/videos/h3&#10;/data/generated/images"
                />
              </label>
              <div className="flex flex-col justify-between gap-3 text-xs">
                <p className="font-semibold leading-5 text-slate-500">
                  会递归读取这些目录下所有子目录和孙目录里的图片/视频。支持同名 <code className="font-mono text-slate-950">.txt</code> 提示词、同名 <code className="font-mono text-slate-950">.json</code> 元数据；没有同名文件也会展示。
                </p>
                <div className="space-y-2">
                  {scanMessage && <p className="rounded-lg bg-slate-100 px-3 py-2 font-black text-slate-600">{scanMessage}</p>}
                  <button
                    onClick={handleSaveScanDirs}
                    disabled={isSavingScanDirs}
                    className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSavingScanDirs ? '保存中' : '保存目录并刷新'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => switchMediaType('image')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-black ${activeMediaType === 'image' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:text-slate-950'}`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              图片提示词
            </button>
            <button
              onClick={() => switchMediaType('video')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-black ${activeMediaType === 'video' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:text-slate-950'}`}
            >
              <Video className="h-3.5 w-3.5" />
              视频提示词
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold shadow-sm">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>懒加载</span>
            <button
              onClick={() => {
                setIsLazyLoadEnabled((prev) => !prev);
                resetVisibleWindow();
              }}
              className={`relative h-5 w-9 rounded-full transition-colors ${isLazyLoadEnabled ? 'bg-slate-950' : 'bg-slate-300'}`}
              title="开启后滚动时分批渲染，适合大量图片视频"
            >
              <span className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-transform ${isLazyLoadEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <span className="border-l border-slate-200 pl-2 text-slate-500">
              {displayedItems.length.toLocaleString()} / {filtered.length.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {activeCategories.map((category) => {
            const isActive = selectedCategory === category.name;
            return (
              <button
                key={category.name}
                onClick={() => {
                  setSelectedCategory(category.name);
                  resetVisibleWindow();
                }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition ${isActive ? 'bg-white text-slate-950 ring-1 ring-slate-300 shadow-sm' : 'bg-white/70 text-slate-500 hover:bg-white hover:text-slate-950'}`}
              >
                {category.name}
                <span className="text-[10px] text-slate-400">{category.count.toLocaleString()}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          <label className="space-y-1">
            <span className="block font-black text-slate-500">来源</span>
            <select value={selectedSource} onChange={(event) => { setSelectedSource(event.target.value); resetVisibleWindow(); }} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none">
              {SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block font-black text-slate-500">语言</span>
            <select value={selectedLanguage} onChange={(event) => { setSelectedLanguage(event.target.value); resetVisibleWindow(); }} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none">
              {LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="block font-black text-slate-500">模型</span>
            <select value={selectedModel} onChange={(event) => { setSelectedModel(event.target.value); resetVisibleWindow(); }} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none">
              {MODELS.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block font-black text-slate-500">作者</span>
            <select value={selectedAuthor} onChange={(event) => { setSelectedAuthor(event.target.value); resetVisibleWindow(); }} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none">
              {AUTHORS.map((author) => <option key={author} value={author}>{author}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 space-y-1">
              <span className="block font-black text-slate-500">排序</span>
              <select value={selectedSort} onChange={(event) => setSelectedSort(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none">
                {SORT_OPTIONS.map((sort) => <option key={sort} value={sort}>{sort}</option>)}
              </select>
            </label>
            <button onClick={handleResetFilters} className="h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center text-slate-600 hover:text-slate-950" title="重置筛选">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <h2 className="text-sm font-black">{activeMediaType === 'video' ? '视频提示词' : '探索'}</h2>
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-500">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{filtered.length.toLocaleString()} 结果</span>
          </div>
        </div>

        {displayedItems.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <div className="space-y-2">
              <Film className="mx-auto h-8 w-8 text-slate-300" />
              <h3 className="text-sm font-black">未找到符合筛选条件的媒体案例</h3>
              <button onClick={handleResetFilters} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">重置筛选</button>
            </div>
          </div>
        ) : (
          <div className="columns-2 gap-1.5 sm:columns-3 md:columns-4 lg:columns-5 2xl:columns-6">
            {displayedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item)}
                aria-label={`打开 ${item.title}`}
                className="group relative mb-1.5 block w-full break-inside-avoid overflow-hidden rounded-md bg-slate-200 text-left shadow-sm ring-1 ring-black/5 transition duration-200 [contain-intrinsic-size:320px] [content-visibility:auto] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10"
              >
                {(() => {
                  const prompt = item.promptCn || item.promptEn || '';
                  const hasPrompt = Boolean(prompt && prompt !== item.title && prompt !== item.titleEn);
                  return !hasPrompt ? (
                    <span className="absolute bottom-2 left-2 z-10 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black text-slate-950 shadow-sm">
                      待补词
                    </span>
                  ) : null;
                })()}
                {item.mediaType === 'video' ? (
                  <video
                    src={item.mediaUrl}
                    poster={item.posterUrl}
                    muted
                    loop
                    playsInline
                    preload="none"
                    disablePictureInPicture
                    onMouseEnter={(event) => {
                      event.currentTarget.play().catch(() => undefined);
                    }}
                    onMouseLeave={(event) => {
                      const video = event.currentTarget as HTMLVideoElement;
                      video.pause();
                      video.currentTime = 0;
                    }}
                    className="block h-auto w-full object-cover"
                  />
                ) : (
                  <img src={item.mediaUrl} alt={item.title} loading={isLazyLoadEnabled ? 'lazy' : 'eager'} decoding="async" className="block h-auto w-full object-cover" />
                )}

                <span className="absolute left-2 top-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-black text-white shadow-sm ring-1 ring-white/20">
                  {item.targetModel === 'seedance-2.0' ? 'Seedance 2.0' : item.targetModel}
                </span>

                {item.mediaType === 'video' && (
                  <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/25">
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </span>
                )}

                <span className="absolute inset-x-0 bottom-0 translate-y-4 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pb-2 pt-9 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                  <span className="block truncate text-xs font-black text-white">{item.title}</span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] font-medium text-white/80">@{item.author || 'Creator'}</span>
                    <span
                      onClick={(event) => handleQuickCopyPrompt(event, item)}
                      className="inline-flex shrink-0 items-center gap-1 rounded bg-white px-2 py-1 text-[10px] font-black text-slate-950"
                    >
                      {copiedId === item.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedId === item.id ? '已复制' : '复制'}
                    </span>
                  </span>
                </span>

                <span
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleLike(item.id);
                  }}
                  className={`absolute bottom-2 right-2 hidden items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black shadow-sm group-hover:inline-flex ${item.isLiked ? 'bg-rose-500 text-white' : 'bg-white text-slate-700'}`}
                >
                  <Heart className={`h-3 w-3 ${item.isLiked ? 'fill-current' : ''}`} />
                  {item.likesCount}
                </span>
              </button>
            ))}
          </div>
        )}

        {isLazyLoadEnabled && visibleCount < filtered.length && (
          <div ref={bottomObserverRef} className="py-6 text-center">
            <button
              onClick={() => setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, filtered.length))}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-black text-slate-700 shadow-sm hover:text-slate-950"
            >
              {isLoadingMore ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-amber-500" />}
              {isLoadingMore ? '正在加载' : `加载更多，剩余 ${(filtered.length - visibleCount).toLocaleString()} 项`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
