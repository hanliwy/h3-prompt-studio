import assert from 'assert';
import fs from 'node:fs';
import path from 'node:path';
import { formatSseEvent } from '../src/server/sse';

const event = formatSseEvent({
  event: 'delta',
  data: {
    stage: 'generate',
    text: 'line 1\nline 2',
  },
});

assert(event.startsWith('event: delta\n'), 'includes event name');
assert(event.endsWith('\n\n'), 'ends as a complete SSE frame');
assert(event.includes('line 1\\nline 2'), 'escapes raw newlines inside JSON payload');

const serverSource = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
const h3AdapterSource = fs.readFileSync(
  path.join(process.cwd(), 'src', 'server', 'h3OpenAiAdapter.ts'),
  'utf8',
);
assert(serverSource.includes("req.on('aborted', abortRequest)"), 'request aborts are observed');
assert(serverSource.includes('signal: requestController.signal'), 'request signal reaches the H3 runtime');
assert(serverSource.includes('createH3OpenAiCall({'), 'server uses the H3 OpenAI adapter');
assert(
  h3AdapterSource.includes('chat.completions.create(completionParams, { signal })'),
  'request signal reaches the upstream OpenAI-compatible SDK call',
);
assert(
  h3AdapterSource.includes('reasoningFallbackAction({'),
  'thinking fallback delegates to the narrowly gated compatibility policy',
);
assert(
  !h3AdapterSource.includes('if (completionParams.thinking || completionParams.reasoning_effort)'),
  'generic model failures do not trigger a second upstream request',
);

console.log('sse tests passed');
