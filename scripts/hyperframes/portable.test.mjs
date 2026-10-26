import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cpSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { invocation as officialInvocation } from '../../plugins/hyperframes/skills/hyperframes/scripts/plugin-cli.mjs';
import { launchPlan, launcher, release } from './run.mjs';
import { safeRelativePath, verifyBundle } from './verify.mjs';

test('固定版本始终经官方 launcher，继承开关不能开启遥测或技能刷新', () => {
  const plan = launchPlan(['render', 'path with spaces'], { HYPERFRAMES_NO_TELEMETRY: '0', HYPERFRAMES_SKIP_SKILLS: '0' });
  assert.deepEqual(plan.args, [launcher, 'render', 'path with spaces']);
  assert.equal(plan.env.HYPERFRAMES_NO_TELEMETRY, '1');
  assert.equal(plan.env.HYPERFRAMES_SKIP_SKILLS, '1');
  const resolved = officialInvocation(plan.args.slice(1), { env: plan.env, platform: 'linux' });
  assert.deepEqual(resolved.args.slice(0, 3), ['--yes', `hyperframes@${release}`, 'render']);
  assert.equal(resolved.env.HYPERFRAMES_PLUGIN_VERSION, release);
});

test('全局参数不能绕过更新和任意脚本转发限制', () => {
  for (const args of [['skills', 'update'], ['--json', 'skills', 'update'], ['upgrade', '--project', '.'], ['--script', 'anything.mjs']]) {
    assert.throws(() => launchPlan(args), /禁止/);
  }
});

test('白名单拒绝跨平台路径逃逸', () => {
  for (const path of ['/absolute', '../outside', 'skills/../../outside', 'C:/outside', 'C:\\outside', 'skills//file', './file']) assert.equal(safeRelativePath(path), false, path);
  assert.equal(safeRelativePath('skills/hyperframes/SKILL.md'), true);
});

test('发布包官方源 SHA 与项目技能相对链接完整', () => {
  assert.deepEqual(verifyBundle().problems, []);
});

// Regression: installing in an existing repository must not audit unrelated files.
test('合入既有仓库时不扫描无关文件、Git元数据或其他技能链接', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'hyperframes-repo-'));
  const bundle = fileURLToPath(new URL('../../', import.meta.url));
  try {
    for (const path of ['plugins', 'scripts/hyperframes', '.agents', 'integration', 'AGENTS.md', 'HYPERFRAMES.md', 'HYPERFRAMES-CHANGELOG.md']) {
      const target = join(fixture, path);
      mkdirSync(join(target, '..'), { recursive: true });
      cpSync(join(bundle, path), target, { recursive: true, verbatimSymlinks: true });
    }
    mkdirSync(join(fixture, '.git'), { recursive: true });
    writeFileSync(join(fixture, '.git', 'unrelated-log'), homedir());
    writeFileSync(join(fixture, 'unrelated.txt'), homedir());
    symlinkSync('unrelated.txt', join(fixture, 'another-skill-link'));
    assert.deepEqual(verifyBundle(fixture).problems, []);
    writeFileSync(join(fixture, 'plugins/hyperframes/unlisted.txt'), 'unexpected');
    assert.ok(verifyBundle(fixture).problems.some((value) => value.includes('非白名单')));
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
