import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'Navbar.tsx'), 'utf8');
assert.ok(source.includes('创意提示词工作室'), 'navbar uses the approved product name');
assert.ok(source.includes('提示词生成'), 'generator navigation uses the approved label');
assert.ok(!source.includes('MiniMax H3 视频工作室'), 'old video-only product name is removed');
assert.ok(!source.includes('AI 生成器'), 'old generator label is removed');
assert.ok(source.includes('图片与视频提示词'), 'product description covers both task types');
console.log('navbarBranding tests passed');
