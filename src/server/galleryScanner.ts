import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { GalleryItem } from '../types';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const SIDECAR_JSON_EXT = '.json';
const SIDECAR_TEXT_EXTENSIONS = ['.txt', '.md'];

interface ScanGalleryDirectoriesArgs {
  roots: string[];
  mediaUrlForFile?: (filePath: string) => string;
  maxDepth?: number;
  maxFiles?: number;
}

const normalizePath = (targetPath: string) => path.resolve(targetPath);

const hashFilePath = (filePath: string) => {
  return crypto.createHash('sha1').update(normalizePath(filePath)).digest('hex').slice(0, 16);
};

const isCjkText = (value: string) => /[\u3400-\u9fff]/.test(value);

const isMediaFile = (filePath: string) => {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext);
};

const readTextIfExists = (filePath: string) => {
  if (!fs.existsSync(filePath)) return '';
  try {
    return fs.readFileSync(filePath, 'utf-8').trim();
  } catch {
    return '';
  }
};

const readJsonIfExists = (filePath: string) => {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
};

const findSidecarText = (mediaPath: string) => {
  const parsed = path.parse(mediaPath);
  for (const ext of SIDECAR_TEXT_EXTENSIONS) {
    const candidate = path.join(parsed.dir, `${parsed.name}${ext}`);
    const text = readTextIfExists(candidate);
    if (text) return text;
  }
  return '';
};

const findPoster = (mediaPath: string) => {
  const parsed = path.parse(mediaPath);
  const candidates = ['.poster.jpg', '.poster.png', '.poster.webp', '-poster.jpg', '-poster.png', '-poster.webp'];
  return candidates
    .map((suffix) => path.join(parsed.dir, `${parsed.name}${suffix}`))
    .find((candidate) => fs.existsSync(candidate));
};

const walkMediaFiles = (root: string, maxDepth: number, maxFiles: number) => {
  const normalizedRoot = normalizePath(root);
  const results: string[] = [];
  const visitedDirs = new Set<string>();

  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth || results.length >= maxFiles) return;

    let realDir = dir;
    try {
      realDir = fs.realpathSync(dir);
    } catch {
      return;
    }
    if (visitedDirs.has(realDir)) return;
    visitedDirs.add(realDir);

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        walk(entryPath, depth + 1);
      } else if (entry.isFile() && isMediaFile(entryPath)) {
        results.push(entryPath);
        if (results.length >= maxFiles) return;
      }
    }
  };

  walk(normalizedRoot, 0);
  return results;
};

export const scanGalleryDirectories = ({
  roots,
  mediaUrlForFile = (filePath) => `/api/gallery/file?path=${encodeURIComponent(filePath)}`,
  maxDepth = 16,
  maxFiles = 20000,
}: ScanGalleryDirectoriesArgs): GalleryItem[] => {
  const uniqueRoots = Array.from(new Set(roots.map(normalizePath))).filter((root) => fs.existsSync(root));
  const seenMedia = new Set<string>();
  const items: GalleryItem[] = [];

  uniqueRoots.forEach((root) => {
    const mediaFiles = walkMediaFiles(root, maxDepth, maxFiles - items.length);

    mediaFiles.forEach((mediaPath) => {
      const normalizedMediaPath = normalizePath(mediaPath);
      if (seenMedia.has(normalizedMediaPath)) return;
      seenMedia.add(normalizedMediaPath);

      const parsed = path.parse(mediaPath);
      const ext = parsed.ext.toLowerCase();
      const isVideo = VIDEO_EXTENSIONS.has(ext);
      const metadataPath = path.join(parsed.dir, `${parsed.name}${SIDECAR_JSON_EXT}`);
      const metadata: any = readJsonIfExists(metadataPath);
      const sidecarText = findSidecarText(mediaPath);
      const posterPath = isVideo ? findPoster(mediaPath) : undefined;
      const promptText = sidecarText || metadata.promptCn || metadata.promptEn || metadata.englishPrompt || metadata.chineseTranslation || parsed.name;
      const relativeSegments = path.relative(root, parsed.dir).split(path.sep).filter(Boolean);
      const parentCategory = relativeSegments.at(-1) || '本地素材';

      items.push({
        id: metadata.id || `scan-${hashFilePath(mediaPath)}`,
        title: metadata.title || parsed.name,
        titleEn: metadata.titleEn || metadata.title || parsed.name,
        mediaType: isVideo ? 'video' : 'image',
        mediaUrl: mediaUrlForFile(mediaPath),
        posterUrl: posterPath ? mediaUrlForFile(posterPath) : isVideo ? metadata.posterUrl : mediaUrlForFile(mediaPath),
        category: metadata.category || parentCategory,
        tags: Array.isArray(metadata.tags) && metadata.tags.length > 0 ? metadata.tags : ['扫描目录', parentCategory],
        promptEn: metadata.promptEn || metadata.englishPrompt || promptText,
        promptCn: metadata.promptCn || metadata.chineseTranslation || (isCjkText(promptText) ? promptText : ''),
        cameraMotion: metadata.cameraMotion || metadata.cameraMovement || 'auto',
        lensType: metadata.lensType || metadata.lens || 'auto',
        lighting: metadata.lighting || metadata.lightingAndAtmosphere || 'auto',
        stylePreset: metadata.stylePreset || metadata.skillId || 'h3-prompt-writing',
        negativePrompt: metadata.negativePrompt || '',
        targetModel: metadata.targetModel || 'minimax-h3',
        author: metadata.author || '本地素材',
        likesCount: metadata.likesCount || 0,
        isLiked: Boolean(metadata.isLiked),
        aspectRatio: metadata.aspectRatio || '16:9',
        duration: metadata.duration || (isVideo ? 'auto' : undefined),
        fps: metadata.fps || 24,
        seed: metadata.seed,
        source: '扫描目录',
        sourceUrl: metadata.sourceUrl || normalizedMediaPath,
        localMediaPath: normalizedMediaPath,
        language: metadata.language || (isCjkText(promptText) ? 'zh' : 'en'),
      });
    });
  });

  return items;
};

export const isPathInsideRoots = (filePath: string, roots: string[]) => {
  const normalizedFile = normalizePath(filePath);
  return roots.map(normalizePath).some((root) => {
    const relative = path.relative(root, normalizedFile);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });
};

export const mediaUrlForConfiguredRoots = (mediaDir: string, filePath: string) => {
  const normalizedMediaDir = normalizePath(mediaDir);
  const normalizedFile = normalizePath(filePath);
  const relativeToMedia = path.relative(normalizedMediaDir, normalizedFile);
  if (relativeToMedia && !relativeToMedia.startsWith('..') && !path.isAbsolute(relativeToMedia)) {
    return `/api/media/${relativeToMedia.split(path.sep).map(encodeURIComponent).join('/')}`;
  }
  return `/api/gallery/file?path=${encodeURIComponent(normalizedFile)}`;
};
