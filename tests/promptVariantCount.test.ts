import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseUserVariantCount, resolveEffectiveVariantCount } from '../src/server/promptVariantCount';

// 解析器规则测试
assert.equal(parseUserVariantCount('给我3组提示词'), 3, '阿拉伯数字 3 组应被识别');
assert.equal(parseUserVariantCount('生成三套方案给我'), 3, '中文数字 三 套应被识别');
assert.equal(parseUserVariantCount('我想要5组提示词'), 5, '阿拉伯数字 5 组应被识别');
assert.equal(parseUserVariantCount('输出两版提示词'), 2, '中文数字 两 版应被识别');
assert.equal(parseUserVariantCount('3个人走在街道上'), null, '"3个人" 不应误判为组数');
assert.equal(parseUserVariantCount('5秒视频，主角是猫'), null, '"5秒" 不应误判为组数');
assert.equal(parseUserVariantCount('一个女孩站在雨里'), null, '无组数表达时应返回 null');
assert.equal(parseUserVariantCount('画面里有三个人物'), null, '"三个人物" 不应误判为组数');
assert.equal(parseUserVariantCount('我要一组提示词就行'), 1, '明确的"一组"应被识别');
assert.equal(parseUserVariantCount(''), null, '空文本返回 null');

// 优先级测试：用户文本覆盖 UI
assert.deepEqual(
  resolveEffectiveVariantCount(1, '给我3组提示词'),
  { count: 3, userOverride: true },
  'UI=1 且文本要求 3 组时，应以文本为准并标记覆盖',
);
assert.deepEqual(
  resolveEffectiveVariantCount(3, '给我3组提示词'),
  { count: 3, userOverride: false },
  '文本数量与 UI 一致时不标记覆盖',
);
assert.deepEqual(
  resolveEffectiveVariantCount(2, '一个女孩站在雨里'),
  { count: 2, userOverride: false },
  '无明确组数时沿用 UI 设置',
);
assert.deepEqual(
  resolveEffectiveVariantCount(7, ''),
  { count: 5, userOverride: false },
  '超出上限的 UI 值被钳制到 5',
);
assert.deepEqual(
  resolveEffectiveVariantCount(0, '生成三套方案'),
  { count: 3, userOverride: true },
  '非法 UI 值仍可被文本覆盖',
);
assert.deepEqual(
  resolveEffectiveVariantCount(1, '给我8组提示词'),
  { count: 1, userOverride: false },
  '超过上限的文本组数不生效，回退 UI',
);

// 源码回归：图片接口多组解析与 variants 保留
const serverSource = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8').replace(/\r\n/g, '\n');
assert.ok(
  serverSource.includes("import { resolveEffectiveVariantCount } from './src/server/promptVariantCount';"),
  '服务端导入组数解析器',
);
assert.ok(
  serverSource.includes("const resolvedCount = resolveEffectiveVariantCount(Number(variantCount), prompt);"),
  '图片接口按用户文本解析组数',
);
assert.ok(
  serverSource.includes("const resolvedCount = resolveEffectiveVariantCount(Number(options.variantCount), roughUserPrompt);"),
  '视频接口按用户文本解析组数',
);
assert.ok(
  serverSource.includes('variants: allResults.length > 1 ? allResults.slice(1) : undefined'),
  '图片结果按实际拆出的组数挂载 variants，而非 UI 组数',
);
assert.ok(
  serverSource.includes('presetMultiVariantRule'),
  '预设图片多组模式包含 JSON 数组输出协议',
);
assert.ok(
  serverSource.includes('已覆盖界面中的'),
  '组数不一致时向界面发送兼容提示',
);

console.log('promptVariantCount tests passed');
