import React, { useState } from 'react';
import { X, Plus, Upload, Link, Video, Image as ImageIcon, Sparkles, Film } from 'lucide-react';
import { GalleryItem, VideoModelTarget, AspectRatio } from '../types';

interface AddGalleryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (newItem: GalleryItem) => void;
}

export const AddGalleryItemModal: React.FC<AddGalleryItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
}) => {
  const [title, setTitle] = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [mediaUrl, setMediaUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [category, setCategory] = useState<GalleryItem['category']>('Cinematic');
  const [promptEn, setPromptEn] = useState('');
  const [promptCn, setPromptCn] = useState('');
  const [cameraMotion, setCameraMotion] = useState('Dolly In + Slow Tracking');
  const [targetModel, setTargetModel] = useState<VideoModelTarget>('minimax-h3');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [tagsStr, setTagsStr] = useState('MiniMax H3, 本地作品, 灵感大片');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setMediaUrl(objectUrl);
      if (file.type.startsWith('video/')) {
        setMediaType('video');
      } else {
        setMediaType('image');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !promptEn.trim()) return;

    const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);

    const newItem: GalleryItem = {
      id: `user-${Date.now()}`,
      title: title.trim(),
      mediaType,
      mediaUrl: mediaUrl.trim() || 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-cars-and-neon-lights-41551-large.mp4',
      posterUrl: posterUrl.trim() || undefined,
      category,
      tags: tags.length ? tags : ['自建灵感', category],
      promptEn: promptEn.trim(),
      promptCn: promptCn.trim() || promptEn.trim(),
      cameraMotion: cameraMotion.trim(),
      targetModel,
      aspectRatio,
      author: '本地创作',
      likesCount: 1,
      isLiked: true,
      duration: '6s',
      fps: 24,
    };

    onAddItem(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">添加自建画廊灵感</h3>
              <p className="text-xs text-slate-400">将本地生成的视频/图片及对应的 Prompt 录入画廊集</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          
          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">作品标题 *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如: 赛博朋克雨夜武士视频作品"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Media Source Choice */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">选择媒体类型</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMediaType('video')}
                  className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    mediaType === 'video'
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>视频 (Video)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMediaType('image')}
                  className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    mediaType === 'image'
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>图片 (Image)</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">风格分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="Cyberpunk">Cyberpunk (赛博朋克)</option>
                <option value="Cinematic">Cinematic (影视大片)</option>
                <option value="Character">Character (人物情绪)</option>
                <option value="Nature">Nature (自然纪录)</option>
                <option value="Anime">Anime (动漫二次元)</option>
                <option value="Commercial">Commercial (商业广告)</option>
                <option value="Fantasy">Fantasy (暗黑魔幻)</option>
              </select>
            </div>
          </div>

          {/* Media Upload or Link */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>上传本地媒体文件 或 粘贴网络 URL</span>
            </label>

            <div className="flex gap-2 items-center">
              <input
                type="file"
                accept="video/*,image/*"
                onChange={handleFileChange}
                className="hidden"
                id="gallery-file-upload"
              />
              <label
                htmlFor="gallery-file-upload"
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer text-xs font-medium flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>浏览本地文件</span>
              </label>

              <span className="text-slate-500 font-mono">或</span>

              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://... (视频/图片 URL)"
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {mediaUrl && (
              <div className="text-[11px] text-emerald-400 font-mono truncate">
                已附加媒体: {mediaUrl}
              </div>
            )}
          </div>

          {/* English Prompt */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">英文 Prompt (English Master Prompt) *</label>
            <textarea
              required
              rows={3}
              value={promptEn}
              onChange={(e) => setPromptEn(e.target.value)}
              placeholder="Cinematic 8K video, a futuristic samurai in neon rain..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Chinese Prompt */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">中文提示词/翻译释义</label>
            <textarea
              rows={2}
              value={promptCn}
              onChange={(e) => setPromptCn(e.target.value)}
              placeholder="电影级8K视频，一位未来武士在霓虹雨夜中行走..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Model & Aspect Ratio */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">生成模型推荐</label>
              <select
                value={targetModel}
                onChange={(e) => setTargetModel(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="minimax-h3">MiniMax Hailuo H3</option>
                <option value="kling-ai">Kling AI 1.5</option>
                <option value="runway-gen3">Runway Gen-3</option>
                <option value="sora">OpenAI Sora</option>
                <option value="luma-dream">Luma Dream Machine</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">画面比例 (Aspect Ratio)</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="16:9">16:9 (横屏大片)</option>
                <option value="9:16">9:16 (竖屏短视频)</option>
                <option value="21:9">21:9 (宽银幕)</option>
                <option value="1:1">1:1 (方形)</option>
              </select>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              取消
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all"
            >
              录入本地画廊
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
