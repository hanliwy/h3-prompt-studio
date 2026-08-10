import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.H3_SERVER_AUTO_START = 'false';
process.env.NODE_ENV = 'production';

const projectRoot = process.cwd();
const skillsRoot = path.join(projectRoot, 'data');
const snapshotSkillFiles = () => {
  const snapshot = new Map<string, string>();
  for (const rootName of ['h3-skills', 'image-skills']) {
    const root = path.join(skillsRoot, rootName);
    const visit = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(absolutePath);
        else {
          const stat = fs.statSync(absolutePath);
          snapshot.set(path.relative(skillsRoot, absolutePath), `${stat.size}:${stat.mtimeMs}`);
        }
      }
    };
    visit(root);
  }
  return snapshot;
};
const skillsBefore = snapshotSkillFiles();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'h3-server-lifecycle-'));
const dataRoot = path.join(tempRoot, 'user-data');
const distRoot = path.join(tempRoot, 'dist');
const unrelatedCwd = path.join(tempRoot, 'cwd');
fs.mkdirSync(distRoot, { recursive: true });
fs.mkdirSync(unrelatedCwd, { recursive: true });
fs.writeFileSync(path.join(distRoot, 'index.html'), '<!doctype html><title>Fixture App</title>', 'utf8');

const serverModule = await import('../server');
assert.equal(typeof serverModule.startServer, 'function', 'server must export startServer');

const originalCwd = process.cwd();
let started: Awaited<ReturnType<typeof serverModule.startServer>> | undefined;
try {
  process.chdir(unrelatedCwd);
  started = await serverModule.startServer({
    dataRoot,
    skillsRoot,
    distRoot,
    host: '127.0.0.1',
    port: 0,
  });

  assert.ok(started.port > 0, 'server returns the actual operating-system assigned port');
  assert.equal(started.url, `http://127.0.0.1:${started.port}`);

  const healthResponse = await fetch(`${started.url}/api/health`);
  assert.equal(healthResponse.status, 200);
  assert.equal((await healthResponse.json() as { status: string }).status, 'ok');

  const pageResponse = await fetch(`${started.url}/`);
  assert.equal(pageResponse.status, 200);
  assert.match(await pageResponse.text(), /Fixture App/);

  const skillsResponse = await fetch(`${started.url}/api/skills`);
  assert.equal(skillsResponse.status, 200);
  const skillsBody = await skillsResponse.json() as { skills: Array<{ id: string }> };
  assert.ok(skillsBody.skills.some((skill) => skill.id === 'h3-prompt-writing'));

  assert.equal(fs.existsSync(path.join(dataRoot, 'config.json')), true);
  assert.equal(fs.existsSync(path.join(dataRoot, 'history')), true);
  assert.equal(fs.existsSync(path.join(unrelatedCwd, 'data')), false);
  assert.deepEqual(snapshotSkillFiles(), skillsBefore, 'official Skill resources remain read-only');
} finally {
  process.chdir(originalCwd);
  if (started) {
    await new Promise<void>((resolve, reject) => {
      started!.server.close((error?: Error) => error ? reject(error) : resolve());
    });
  }
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log('server lifecycle tests passed');
