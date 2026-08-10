import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const builderConfig = JSON.parse(
  fs.readFileSync(path.join(root, 'electron-builder.json'), 'utf8'),
);

const extraResources = Array.isArray(builderConfig.extraResources)
  ? builderConfig.extraResources
  : [];

for (const requiredResource of [
  { from: 'data/h3-skills', to: 'skills/h3-skills' },
  { from: 'data/image-skills', to: 'skills/image-skills' },
]) {
  assert.ok(
    extraResources.some((resource: unknown) =>
      JSON.stringify(resource) === JSON.stringify(requiredResource)),
    `desktop packages must include ${requiredResource.from}`,
  );
}

const serializedResources = JSON.stringify(extraResources);
for (const runtimePath of [
  'data/config.json',
  'data/gallery.json',
  'data/history.json',
  'data/history',
  'data/media',
  'data/skills.json',
]) {
  assert.equal(
    serializedResources.includes(runtimePath),
    false,
    `${runtimePath} must remain user-owned runtime data`,
  );
}

const electronMainSource = fs.readFileSync(path.join(root, 'electron', 'main.cjs'), 'utf8');
assert.ok(electronMainSource.includes('app.requestSingleInstanceLock()'), 'desktop app must prevent concurrent writers');
assert.ok(electronMainSource.includes("app.on('before-quit'"), 'desktop app must handle backend shutdown');
assert.ok(electronMainSource.includes('backend.server.close'), 'desktop app must close the embedded HTTP server');
assert.ok(electronMainSource.includes('app.isPackaged'), 'desktop app must distinguish packaged and development Skill roots');
assert.ok(electronMainSource.includes("path.join(app.getAppPath(), 'data')"), 'electron:dev must load Skills from the project data directory');

console.log('electron packaging tests passed');
