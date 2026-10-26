#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
export function safeRelativePath(value) {
  if (typeof value !== 'string' || !value || isAbsolute(value) || value.includes('\\') || /^[A-Za-z]:/.test(value)) return false;
  return value.split('/').every((part) => part && part !== '.' && part !== '..');
}

function isInside(base, target) {
  const rel = relative(base, target);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return [path];
  });
}

export function verifyBundle(bundleRoot = root) {
  const root = realpathSync(bundleRoot);
  const pluginRoot = join(root, 'plugins', 'hyperframes');
  const manifest = JSON.parse(readFileSync(join(pluginRoot, 'SOURCE_SHA256.json'), 'utf8'));
  const problems = [];
  if (manifest.commit !== '96e2154d7cd2eeadfe7287a7c0dadd50221df9c3' || manifest.version !== '0.8.154' || manifest.scope !== 'core-10') problems.push('固定来源信息不一致');
  const files = Object.entries(manifest.files);
  for (const [rel, expected] of files) {
    if (!safeRelativePath(rel)) { problems.push(`白名单路径不安全: ${rel}`); continue; }
    const path = join(pluginRoot, rel);
    if (!existsSync(path) || lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile() || !isInside(pluginRoot, realpathSync(path))) {
      problems.push(`源文件缺失、非普通文件或路径逃逸: ${rel}`); continue;
    }
    const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (actual !== expected) problems.push(`源文件 SHA256 不匹配: ${rel}`);
  }
  const allowed = new Set([...Object.keys(manifest.files), 'SOURCE_SHA256.json']);
  for (const path of walk(pluginRoot)) {
    const rel = relative(pluginRoot, path).split(sep).join('/');
    if (!allowed.has(rel)) problems.push(`插件目录含非白名单文件: ${rel}`);
  }
  for (const name of manifest.skills) {
    const link = join(root, '.agents', 'skills', name);
    const expected = `../../plugins/hyperframes/skills/${name}`;
    if (!existsSync(link) || !lstatSync(link).isSymbolicLink() || readlinkSync(link) !== expected || !isInside(root, realpathSync(link))) {
      problems.push(`项目技能链接缺失或不安全: ${name}`);
    }
  }
  const privateRoot = homedir();
  // Verify only this integration, so unrelated repo files and .git stay outside scope.
  const managed = [
    ...walk(pluginRoot),
    ...walk(join(root, 'scripts', 'hyperframes')),
    ...manifest.skills.map((name) => join(root, '.agents', 'skills', name)),
    ...['AGENTS.md', 'HYPERFRAMES.md', 'HYPERFRAMES-CHANGELOG.md',
      'integration/hyperframes.gitignore', 'integration/marketplace.example.json']
      .map((rel) => join(root, rel)),
  ];
  let links = 0;
  for (const path of managed) {
    if (!existsSync(path)) { problems.push(`受管文件缺失: ${relative(root, path)}`); continue; }
    const rel = relative(root, path).split(sep).join('/');
    if (lstatSync(path).isSymbolicLink()) {
      links++;
      if (!existsSync(path) || !isInside(root, realpathSync(path))) problems.push(`包内链接逃逸: ${rel}`);
      continue;
    }
    if (privateRoot.length > 3 && readFileSync(path).includes(Buffer.from(privateRoot))) problems.push(`含当前设备个人目录: ${rel}`);
  }
  const skillFiles = files.filter(([rel]) => rel.startsWith('skills/')).length;
  if (files.length !== 394 || skillFiles !== 390 || manifest.skills.length !== 10 || links !== 10) problems.push('固定版本文件或技能链接数量不符');
  return { status: problems.length ? 'REVIEW' : 'VERIFIED', sourceFiles: files.length, skillFiles, skills: manifest.skills.length, relativeLinks: links, problems };
}

if (process.argv[1] && pathToFileURL(realpathSync(resolve(process.argv[1]))).href === import.meta.url) {
  const report = verifyBundle();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'VERIFIED' ? 0 : 1;
}
