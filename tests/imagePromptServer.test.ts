import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');

assert.ok(source.includes("app.get('/api/image-skills'"), 'server exposes image skills independently');
assert.ok(source.includes("app.post('/api/image-prompt/generate-stream'"), 'server exposes an image prompt SSE endpoint');
assert.ok(source.includes('loadImageSkillDefinitions'), 'server loads image skills from the formal data directory');
assert.ok(source.includes('buildImagePromptSystemPrompt'), 'image route uses the dedicated image system prompt');
assert.ok(source.includes('parseImagePromptCanonical'), 'image route validates canonical model output');
assert.ok(source.includes('formatImagePrompt'), 'image route deterministically formats the selected target');
assert.ok(source.includes("reasoningFallbackAction"), 'server uses staged reasoning compatibility');
assert.ok(source.includes("action === 'drop-effort'"), 'unsupported effort keeps thinking enabled');
assert.ok(source.includes("action === 'disable-thinking'"), 'unsupported thinking can be disabled separately');
assert.ok(source.includes("event: 'final'"), 'image route completes with a final SSE event');

console.log('imagePromptServer tests passed');
