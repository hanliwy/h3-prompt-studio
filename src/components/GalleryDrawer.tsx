import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Heart,
  Pencil,
  Play,
  Save,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { GalleryItem } from '../types';

interface GalleryDrawerProps {
  item: GalleryItem | null;
  allGalleryItems?: GalleryItem[];
  isOpen: boolean;
  onClose: () => void;
  onRemixInGenerator: (item: GalleryItem) => void;
  onToggleLike: (itemId: string) => void;
  onSelectOtherItem?: (item: GalleryItem) => void;
  onPromptUpdated?: (itemId: string, prompt: string) => void;
  onRefreshGallery?: () => void;
}

export const GalleryDrawer: React.FC<GalleryDrawerProps> = ({
  item,
  allGalleryItems = [],
  isOpen,
  onClose,
  onRemixInGenerator,
  onToggleLike,
  onSelectOtherItem,
  onPromptUpdated,
  onRefreshGallery,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptSaveMessage, setPromptSaveMessage] = useState('');

  useEffect(() => {
    if (!item) return;
    setPromptDraft(item.promptCn || item.promptEn || item.title);
    setIsEditingPrompt(false);
    setPromptSaveMessage('');
  }, [item?.id]);

  if (!isOpen || !item) return null;

  const isVideo = item.mediaType === 'video';
  const relatedItems = allGalleryItems.length > 0 ? allGalleryItems : [item];
  const promptText = item.promptCn || item.promptEn || item.title;
  const hasPrompt = Boolean(promptText && promptText !== item.title && promptText !== item.titleEn);
  const canWriteSidecar = Boolean(item.localMediaPath || (item.source === '扫描目录' && item.sourceUrl));

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    window.setTimeout(() => setCopiedType(null), 1600);
  };

  const handleDownloadJson = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(item, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${item.titleEn || item.title}-prompt-metadata.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleSaveSidecarPrompt = async () => {
    const nextPrompt = promptDraft.trim();
    const mediaPath = item.localMediaPath || item.sourceUrl || '';
    if (!nextPrompt) {
      setPromptSaveMessage('提示词不能为空');
      return;
    }
    if (!mediaPath) {
      setPromptSaveMessage('这条素材没有本地媒体路径，不能写入同名 txt');
      return;
    }

    setIsSavingPrompt(true);
    setPromptSaveMessage('');
    try {
      const res = await fetch('/api/gallery/sidecar-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaPath, prompt: nextPrompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '保存失败');
      }
      onPromptUpdated?.(item.id, nextPrompt);
      onRefreshGallery?.();
      setIsEditingPrompt(false);
      setPromptSaveMessage('已创建/更新同名 txt');
    } catch (error: any) {
      setPromptSaveMessage(error.message || '保存失败');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden bg-white text-slate-950">
      <div className={`relative flex min-w-0 flex-1 items-center justify-center px-4 py-8 ${isVideo ? 'bg-[#111419]' : 'bg-[#f7f6f3]'}`}>
        <button
          onClick={onClose}
          className={`absolute right-4 top-6 z-20 grid h-10 w-10 place-items-center rounded-full shadow-lg ${isVideo ? 'bg-white/80 text-slate-900 hover:bg-white' : 'bg-white text-slate-700 hover:text-slate-950'}`}
          title="关闭"
        >
          <X className="h-5 w-5" />
        </button>

        <div className={`flex h-full w-full items-center justify-center ${isVideo ? 'max-w-[1120px]' : 'max-w-[980px]'}`}>
          {isVideo ? (
            <video
              src={item.mediaUrl}
              poster={item.posterUrl}
              autoPlay
              loop
              muted
              playsInline
              controls
              className="max-h-[82vh] w-full max-w-[1120px] rounded-lg bg-black object-contain shadow-2xl"
            />
          ) : (
            <img
              src={item.mediaUrl}
              alt={item.title}
              className="max-h-[86vh] max-w-full rounded-lg object-contain shadow-[0_26px_80px_rgba(15,23,42,0.18)]"
            />
          )}
        </div>
      </div>

      <aside className="hidden w-[380px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white px-7 py-8 xl:block">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-400">
              {item.category} - {item.source || '本地素材'}
            </p>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-black leading-tight tracking-tight text-slate-950">{item.title}</h2>
              {!hasPrompt && (
                <span className="shrink-0 rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-black text-slate-950">
                  待补词
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-black text-slate-500">收录于 {item.duration || '6s'}</span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-black text-slate-500">{item.language || 'zh'}</span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-black text-slate-500">{item.targetModel}</span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-black text-slate-500">{item.aspectRatio}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onToggleLike(item.id)}
              className={`rounded-xl border px-3 py-2 text-xs font-black ${item.isLiked ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}
            >
              <Heart className={`mr-1.5 inline h-3.5 w-3.5 ${item.isLiked ? 'fill-current' : ''}`} />
              保存
            </button>
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
              @{item.author || 'MiniMax Creator'}
            </button>
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
              {item.source || '来源'}
            </button>
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
              {isVideo ? '视频' : '图片'}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400">提示词</h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setIsEditingPrompt((prev) => !prev);
                    setPromptDraft(promptText);
                    setPromptSaveMessage('');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-700 hover:border-slate-400"
                  title="编辑并写入同名 txt"
                >
                  <Pencil className="h-3 w-3" />
                  编辑
                </button>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-black">
                  <button onClick={() => handleCopy(item.promptEn, 'en')} className="rounded-lg px-2.5 py-1 text-slate-500 hover:bg-white hover:text-slate-950">EN</button>
                  <button onClick={() => handleCopy(promptText, 'cn')} className="rounded-lg bg-white px-2.5 py-1 text-slate-950 shadow-sm">中文</button>
                </div>
              </div>
            </div>
            {isEditingPrompt ? (
              <div className="space-y-2">
                <textarea
                  value={promptDraft}
                  onChange={(event) => setPromptDraft(event.target.value)}
                  className="min-h-40 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium leading-7 text-slate-900 outline-none focus:border-slate-400"
                  placeholder="粘贴或编辑这条素材对应的提示词，保存后会创建同名 .txt"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-[11px] font-bold ${canWriteSidecar ? 'text-slate-500' : 'text-amber-600'}`}>
                    {canWriteSidecar ? '保存后写入媒体同目录同名 .txt' : '这条素材不是扫描目录里的本地文件，不能自动写 txt'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditingPrompt(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-slate-400">
                      取消
                    </button>
                    <button
                      onClick={handleSaveSidecarPrompt}
                      disabled={isSavingPrompt || !canWriteSidecar}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isSavingPrompt ? '保存中' : '保存 txt'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className={`text-base font-medium leading-8 ${hasPrompt ? 'text-slate-800' : 'rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-slate-600'}`}>
                {promptText}
              </p>
            )}
            {promptSaveMessage && (
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{promptSaveMessage}</p>
            )}
            <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <summary className="cursor-pointer text-xs font-black text-slate-500">英文原文</summary>
              <p className="mt-2 text-sm leading-7 text-slate-700">{item.promptEn}</p>
            </details>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleCopy(item.promptEn, 'prompt')}
              className="rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-slate-800"
            >
              {copiedType === 'prompt' || copiedType === 'en' ? <Check className="mr-1.5 inline h-3.5 w-3.5" /> : <Copy className="mr-1.5 inline h-3.5 w-3.5" />}
              复制提示词
            </button>
            <button
              onClick={() => onRemixInGenerator(item)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-900 hover:border-slate-400"
            >
              <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
              去生成
            </button>
          </div>

          <div className="space-y-2 text-xs text-slate-500">
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <span className="font-black">运镜</span>
              <span className="max-w-[210px] truncate font-semibold text-slate-700">{item.cameraMotion}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-black">镜头</span>
              <span className="max-w-[210px] truncate font-semibold text-slate-700">{item.lensType || 'cinematic prime'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-black">光影</span>
              <span className="max-w-[210px] truncate font-semibold text-slate-700">{item.lighting || 'cinematic lighting'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-black">Seed</span>
              <span className="font-mono font-semibold text-slate-700">{item.seed || 123456}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>

          <button
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-slate-400"
          >
            <Download className="h-3.5 w-3.5" />
            导出 JSON 元数据
          </button>
        </div>
      </aside>

      <aside className="hidden w-[72px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white px-2 py-2 2xl:block">
        <div className="space-y-2">
          {relatedItems.slice(0, 48).map((other) => {
            const isActive = other.id === item.id;
            return (
              <button
                type="button"
                key={other.id}
                onClick={() => onSelectOtherItem?.(other)}
                className={`relative block h-[62px] w-full overflow-hidden rounded-lg border bg-slate-100 [content-visibility:auto] [contain-intrinsic-size:62px] ${isActive ? 'border-slate-950 ring-2 ring-slate-950/10' : 'border-slate-200 hover:border-slate-500'}`}
                title={other.title}
              >
                {other.mediaType === 'video' ? (
                  <video src={other.mediaUrl} poster={other.posterUrl} muted playsInline preload="none" disablePictureInPicture className="h-full w-full object-cover" />
                ) : (
                  <img src={other.mediaUrl} alt={other.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                )}
                {other.mediaType === 'video' && (
                  <span className="absolute bottom-1 right-1 grid h-4 w-4 place-items-center rounded-full bg-black/70 text-white">
                    <Play className="h-2.5 w-2.5 fill-current" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="xl:hidden absolute bottom-4 left-4 right-4 rounded-2xl bg-white/95 p-3 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black">{item.title}</h2>
            <p className="truncate text-xs font-medium text-slate-500">{item.promptCn || item.promptEn}</p>
          </div>
          <button onClick={() => handleCopy(item.promptEn, 'mobile')} className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">
            {copiedType === 'mobile' ? '已复制' : '复制'}
          </button>
        </div>
      </div>
    </div>
  );
};
