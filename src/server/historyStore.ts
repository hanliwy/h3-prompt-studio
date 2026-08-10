import fs from 'fs';
import path from 'path';
import type { PromptHistoryItem } from '../types';

export interface StoredPromptHistoryItem extends PromptHistoryItem {
  createdAtIso?: string;
  historyDate?: string;
  updatedAtIso?: string;
}

interface HistoryStoreOptions {
  historyDir: string;
  legacyHistoryFile?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const getDateKey = (value?: string) => {
  if (value && DATE_PATTERN.test(value)) return value;
  const date = value ? new Date(value) : new Date();
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
};

const historyFileForDate = (historyDir: string, dateKey: string) => {
  return path.join(historyDir, `${dateKey}.jsonl`);
};

const listHistoryFiles = (historyDir: string) => {
  if (!fs.existsSync(historyDir)) return [];
  return fs
    .readdirSync(historyDir)
    .filter((file) => file.endsWith('.jsonl') && DATE_PATTERN.test(path.basename(file, '.jsonl')))
    .sort()
    .reverse()
    .map((file) => path.join(historyDir, file));
};

const parseJsonlFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as StoredPromptHistoryItem;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as StoredPromptHistoryItem[];
};

const readLegacyHistory = (legacyHistoryFile?: string) => {
  if (!legacyHistoryFile || !fs.existsSync(legacyHistoryFile)) return [];
  try {
    const legacy = JSON.parse(fs.readFileSync(legacyHistoryFile, 'utf-8'));
    return Array.isArray(legacy) ? (legacy as StoredPromptHistoryItem[]) : [];
  } catch {
    return [];
  }
};

export const appendHistoryItem = ({ historyDir }: HistoryStoreOptions, item: PromptHistoryItem) => {
  ensureDir(historyDir);
  const createdAtIso = (item as StoredPromptHistoryItem).createdAtIso || new Date().toISOString();
  const historyDate = (item as StoredPromptHistoryItem).historyDate || getDateKey(createdAtIso);
  const storedItem: StoredPromptHistoryItem = {
    ...item,
    createdAtIso,
    historyDate,
  };
  fs.appendFileSync(historyFileForDate(historyDir, historyDate), `${JSON.stringify(storedItem)}\n`, 'utf-8');
  return storedItem;
};

export const loadHistoryItems = (
  options: HistoryStoreOptions,
  {
    date,
    limit = 300,
  }: {
    date?: string;
    limit?: number;
  } = {},
) => {
  ensureDir(options.historyDir);
  const normalizedLimit = Math.max(1, Math.min(Number(limit) || 300, 10000));
  const files = date && DATE_PATTERN.test(date)
    ? [historyFileForDate(options.historyDir, date)]
    : listHistoryFiles(options.historyDir);

  const results: StoredPromptHistoryItem[] = [];
  const seenIds = new Set<string>();

  for (const file of files) {
    const items = parseJsonlFile(file).reverse();
    for (const item of items) {
      if (!item?.id || seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      results.push(item);
      if (results.length >= normalizedLimit) {
        return results;
      }
    }
  }

  if (!date && results.length < normalizedLimit) {
    for (const item of readLegacyHistory(options.legacyHistoryFile)) {
      if (!item?.id || seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      results.push(item);
      if (results.length >= normalizedLimit) break;
    }
  }

  return results;
};

export const deleteHistoryItem = (options: HistoryStoreOptions, id: string) => {
  ensureDir(options.historyDir);
  let removed = 0;

  for (const file of listHistoryFiles(options.historyDir)) {
    const before = parseJsonlFile(file);
    const after = before.filter((item) => item.id !== id);
    removed += before.length - after.length;
    if (after.length !== before.length) {
      fs.writeFileSync(file, after.map((item) => JSON.stringify(item)).join('\n') + (after.length ? '\n' : ''), 'utf-8');
    }
  }

  if (options.legacyHistoryFile && fs.existsSync(options.legacyHistoryFile)) {
    const before = readLegacyHistory(options.legacyHistoryFile);
    const after = before.filter((item) => item.id !== id);
    removed += before.length - after.length;
    if (after.length !== before.length) {
      fs.writeFileSync(options.legacyHistoryFile, JSON.stringify(after, null, 2), 'utf-8');
    }
  }

  return removed;
};

export const clearHistory = (options: HistoryStoreOptions) => {
  ensureDir(options.historyDir);
  for (const file of listHistoryFiles(options.historyDir)) {
    fs.unlinkSync(file);
  }
  if (options.legacyHistoryFile) {
    fs.writeFileSync(options.legacyHistoryFile, JSON.stringify([], null, 2), 'utf-8');
  }
};

export const listHistoryDates = (options: HistoryStoreOptions) => {
  ensureDir(options.historyDir);
  return listHistoryFiles(options.historyDir).map((file) => {
    const date = path.basename(file, '.jsonl');
    const items = parseJsonlFile(file);
    const stat = fs.statSync(file);
    return {
      date,
      count: items.length,
      bytes: stat.size,
    };
  });
};
