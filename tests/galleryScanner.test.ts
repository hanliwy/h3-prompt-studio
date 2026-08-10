import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { scanGalleryDirectories } from '../src/server/galleryScanner';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'h3-gallery-scan-'));
const rootA = path.join(tmpRoot, 'root-a');
const rootB = path.join(tmpRoot, 'root-b');
const nested = path.join(rootA, 'nested', 'child');

fs.mkdirSync(nested, { recursive: true });
fs.mkdirSync(rootB, { recursive: true });

fs.writeFileSync(path.join(nested, '古镇美女.mp4'), 'fake video');
fs.writeFileSync(path.join(nested, '古镇美女.txt'), '成年东方美女，黑色低发髻，墨绿色改良短旗袍，小桥流水古镇，细雨天气。');
fs.writeFileSync(
  path.join(rootB, 'product.json'),
  JSON.stringify({
    title: '黑金香水广告',
    promptEn: 'Luxury black and gold perfume commercial, macro orbit shot.',
    category: '产品广告',
    targetModel: 'minimax-h3',
    tags: ['product', 'ad'],
  }),
);
fs.writeFileSync(path.join(rootB, 'product.png'), 'fake image');
fs.writeFileSync(path.join(rootB, 'lonely.webp'), 'fake image');

const items = scanGalleryDirectories({
  roots: [rootA, rootB, path.join(tmpRoot, 'missing')],
  mediaUrlForFile: (filePath) => `/media/${path.basename(filePath)}`,
});

const txtItem = items.find((item) => item.title === '古镇美女');
assert(txtItem, 'recursively scans media in child directories');
assert.equal(txtItem?.mediaType, 'video');
assert.equal(txtItem?.promptCn, '成年东方美女，黑色低发髻，墨绿色改良短旗袍，小桥流水古镇，细雨天气。');
assert.equal(txtItem?.source, '扫描目录');

const jsonItem = items.find((item) => item.title === '黑金香水广告');
assert(jsonItem, 'pairs same-name json metadata with media');
assert.equal(jsonItem?.mediaType, 'image');
assert.equal(jsonItem?.promptEn, 'Luxury black and gold perfume commercial, macro orbit shot.');
assert.deepEqual(jsonItem?.tags, ['product', 'ad']);

const fallbackItem = items.find((item) => item.title === 'lonely');
assert(fallbackItem, 'creates a gallery item without txt/json sidecar');
assert.equal(fallbackItem?.promptEn, 'lonely');

fs.rmSync(tmpRoot, { recursive: true, force: true });

console.log('galleryScanner tests passed');
