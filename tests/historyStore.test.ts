import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  appendHistoryItem,
  clearHistory,
  deleteHistoryItem,
  listHistoryDates,
  loadHistoryItems,
} from '../src/server/historyStore';
import type { PromptHistoryItem } from '../src/types';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'h3-history-store-'));
const historyDir = path.join(tmpRoot, 'history');
const legacyHistoryFile = path.join(tmpRoot, 'history.json');

const makeItem = (id: string, createdAtIso: string): PromptHistoryItem & { createdAtIso: string } => ({
  id,
  createdAt: createdAtIso,
  createdAtIso,
  userQuery: `query ${id}`,
  structuredOutput: {
    title: `title ${id}`,
    englishPrompt: `prompt ${id}`,
    chineseTranslation: `中文 ${id}`,
    subjectDescription: '',
    cameraMovement: '',
    lightingAndAtmosphere: '',
    styleAndAesthetics: '',
    negativePrompt: '',
    technicalParams: {
      targetModel: 'minimax-h3',
      aspectRatio: '16:9',
      fps: 24,
      duration: '6s',
      motionSpeed: 5,
    },
  },
  modelUsed: 'deepseek-v4-flash',
  isFavorite: false,
});

appendHistoryItem({ historyDir, legacyHistoryFile }, makeItem('older', '2026-08-06T12:00:00.000Z'));
appendHistoryItem({ historyDir, legacyHistoryFile }, makeItem('newer-a', '2026-08-07T12:00:00.000Z'));
appendHistoryItem({ historyDir, legacyHistoryFile }, makeItem('newer-b', '2026-08-07T13:00:00.000Z'));

fs.writeFileSync(legacyHistoryFile, JSON.stringify([makeItem('legacy', '2026-08-01T12:00:00.000Z')], null, 2), 'utf-8');

assert(fs.existsSync(path.join(historyDir, '2026-08-07.jsonl')), 'writes date-sharded jsonl file');

const recent = loadHistoryItems({ historyDir, legacyHistoryFile }, { limit: 2 });
assert.deepEqual(recent.map((item) => item.id), ['newer-b', 'newer-a']);

const dayItems = loadHistoryItems({ historyDir, legacyHistoryFile }, { date: '2026-08-06', limit: 10 });
assert.deepEqual(dayItems.map((item) => item.id), ['older']);

const withLegacy = loadHistoryItems({ historyDir, legacyHistoryFile }, { limit: 10 });
assert(withLegacy.some((item) => item.id === 'legacy'), 'falls back to legacy data when room remains');

const dates = listHistoryDates({ historyDir, legacyHistoryFile });
assert.deepEqual(dates.map((item) => item.date), ['2026-08-07', '2026-08-06']);

const removed = deleteHistoryItem({ historyDir, legacyHistoryFile }, 'newer-a');
assert.equal(removed, 1);
assert(!loadHistoryItems({ historyDir, legacyHistoryFile }, { limit: 10 }).some((item) => item.id === 'newer-a'));

clearHistory({ historyDir, legacyHistoryFile });
assert.equal(loadHistoryItems({ historyDir, legacyHistoryFile }, { limit: 10 }).length, 0);

const viteConfig = fs.readFileSync(path.join(process.cwd(), 'vite.config.ts'), 'utf8');
assert(viteConfig.includes('**/data/history/**'), 'Vite ignores runtime history shards');
assert(viteConfig.includes('**/data/history.json'), 'Vite ignores the legacy runtime history file');

fs.rmSync(tmpRoot, { recursive: true, force: true });

console.log('historyStore tests passed');
