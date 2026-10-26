#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { invocation as officialInvocation } from '../../plugins/hyperframes/skills/hyperframes/scripts/plugin-cli.mjs';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const release = '0.8.154';
export const launcher = join(root, 'plugins', 'hyperframes', 'skills', 'hyperframes', 'scripts', 'plugin-cli.mjs');

export function launchPlan(args, inheritedEnv = process.env) {
  if (!Array.isArray(args) || args.length === 0) throw new Error('请指定 HyperFrames 命令；环境检查使用 --check-env。');
  if (args.some((arg) => ['skills', 'upgrade', '--script'].includes(arg))) {
    throw new Error('此移植包禁止 skills、upgrade 和任意 --script 转发；保持核心 10 项与固定版本。');
  }
  const manifest = JSON.parse(readFileSync(join(root, 'plugins', 'hyperframes', '.codex-plugin', 'plugin.json'), 'utf8'));
  if (manifest.name !== 'hyperframes' || manifest.version !== release) throw new Error('插件 manifest 与移植包固定版本不一致。');
  return {
    command: process.execPath,
    args: [launcher, ...args],
    env: {
      ...inheritedEnv,
      HYPERFRAMES_NO_TELEMETRY: '1',
      HYPERFRAMES_SKIP_SKILLS: '1',
      HYPERFRAMES_NO_UPDATE_CHECK: '1',
      HYPERFRAMES_PLUGIN_VERSION: release,
      HYPERFRAMES_SKILL_PKG_VERSION: release,
    },
  };
}

function probe(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, timeout: 10000 });
  return result.status === 0 && !result.error;
}

export function checkEnvironment() {
  let npx = false;
  if (process.platform === 'win32') {
    try {
      const resolved = officialInvocation(['--version']);
      npx = resolved.command === process.execPath && existsSync(resolved.args[0])
        && probe(process.execPath, [resolved.args[0], '--version']);
    } catch { /* Report missing npm without installing it. */ }
  } else {
    npx = probe('npx', ['--version']);
  }
  const checks = {
    node22OrNewer: Number(process.versions.node.split('.')[0]) >= 22,
    npmNpx: npx,
    ffmpeg: probe('ffmpeg', ['-version']),
    ffprobe: probe('ffprobe', ['-version']),
  };
  return {
    status: Object.values(checks).every(Boolean) ? 'DEPENDENCIES_FOUND' : 'REVIEW',
    checks,
    browser: '尚未验收；实际浏览器与无界面渲染能力请在目标设备运行 doctor/check 验证。',
    changes: '仅检查依赖；未安装软件、下载 CLI 或模型、登录服务、安装额外工作流。',
  };
}

const isMain = process.argv[1] && pathToFileURL(realpathSync(resolve(process.argv[1]))).href === import.meta.url;
if (isMain) {
  try {
    const args = process.argv.slice(2);
    if (args[0] === '--check-env') {
      const report = checkEnvironment();
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = report.status === 'DEPENDENCIES_FOUND' ? 0 : 1;
    } else if (Number(process.versions.node.split('.')[0]) < 22) {
      throw new Error('需要 Node.js 22 或更高版本；请先自行准备环境。');
    } else {
      const plan = launchPlan(args);
      const result = spawnSync(plan.command, plan.args, { env: plan.env, stdio: 'inherit', windowsHide: true });
      if (result.error) throw result.error;
      process.exitCode = result.status ?? 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
