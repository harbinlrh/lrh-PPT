# HyperFrames 0.8.154 核心 10 项移植包

此目录用于将已核验的 HyperFrames 核心技能放入 Git 仓库，在另一台设备或支持仓库技能的 Codex 环境中复用。它是第三方固定版本的整理包；官方代码、清单、图标和许可证保持原样。

| 项目 | 固定值 |
| --- | --- |
| 上游 | https://github.com/heygen-com/hyperframes |
| 提交 | `96e2154d7cd2eeadfe7287a7c0dadd50221df9c3` |
| CLI / 插件版本 | `0.8.154` |
| 范围 | 核心 10 项，390 个技能文件 |
| 官方文件总数 | 394，另附 `SOURCE_SHA256.json` 来源白名单 |
| 上游许可证 | Apache-2.0，见 `plugins/hyperframes/LICENSE` |

核心名称：`hyperframes`、`hyperframes-animation`、`hyperframes-audio`、`hyperframes-cli`、`hyperframes-core`、`hyperframes-creative`、`hyperframes-keyframes`、`hyperframes-registry`、`hyperframes-studio`、`media-use`。

## 放进仓库

若用作独立仓库，保持本目录结构即可；若合入已有仓库，将 `plugins/hyperframes/`、`scripts/hyperframes/` 中的入口和检查脚本以及 `.agents/skills/` 中的 10 个链接按同一相对布局放入目标根目录。存在同名文件或技能时先比较并合并，不覆盖已有配置。说明采用独立文件 `HYPERFRAMES.md`；`AGENTS.md` 仅含 HyperFrames 规则，已有根指令时合并相关段落；`integration/hyperframes.gitignore` 的忽略项也需合并而非覆盖现有 `.gitignore`。也可以保留本目录为独立子目录，并把它作为 Codex 项目打开。

`.agents/skills/<名称>` 指向 `../../plugins/hyperframes/skills/<名称>`，所有目标均在包内。Codex 支持扫描符号链接技能目录，见[官方技能文档](https://learn.chatgpt.com/docs/build-skills)。Git 克隆应保留符号链接。在 Windows 上需允许符号链接并使用支持它的 Git 配置；若检出结果只是包含目标路径的文本文件，先修复链接或使用插件安装方式，不能据此宣称项目技能已加载。

网页上的普通聊天不会仅因文件已上传就获得本地 CLI。使用能读取仓库并执行命令的 Codex 工作环境，将该仓库关联到任务；任务环境仍需准备依赖并实际验收。不同设备的登录和额度不会由本包同步。

如果手机 Codex / Remote 连接的是已经装好技能的同一台 Mac，可以直接使用主机上的项目、插件和工具，无需为了远程使用先同步 GitHub。主机须保持在线、唤醒并运行应用；普通网页聊天不会自动连接这台电脑。见[官方远程连接说明](https://learn.chatgpt.com/docs/remote-connections)。

## Codex Cloud 使用步骤

1. 将本包合入选定仓库后，在 Codex 的 Cloud 环境创建流程中选择该仓库。
2. 准备 Node.js 22+、npm、FFmpeg / ffprobe 和目标渲染环境，运行本包完整性与依赖检查；缺项在环境准备流程中处理。仓库上传本身不完成依赖安装。
3. 在云环境运行真实的 `doctor`、composition `check` 和短片渲染，再审阅准备报告并发布环境；之后的新任务选择该环境。

仓库技能可以随云任务使用，本机个人技能不会自动同步。**此包尚未完成云端短片渲染验收**；也不把 Cloud 的 shell 渲染能力等同于本机浏览器或 Computer Use。流程和当前限制见[官方云环境文档](https://learn.chatgpt.com/docs/environments/cloud-environments)。

## 先核验，再运行

需要 Node.js 22 或更高版本及 npm/npx。视频处理另需 FFmpeg、ffprobe 与可用的 Chrome/Chromium 渲染环境。环境检查不会自动安装软件、模型或登录账号：

```sh
node scripts/hyperframes/verify.mjs
node scripts/hyperframes/run.mjs --check-env
```

本包没有硬编码浏览器位置。若目标环境不能自动发现浏览器，根据该设备的 HyperFrames `doctor` 输出配置，再执行真实渲染检查。纯命令行依赖通过不等于浏览器、字幕模型或云端服务验收通过。

在包内创建独立工作目录并验证 CLI 的示例：

```sh
mkdir work
cd work
node ../scripts/hyperframes/run.mjs --version
node ../scripts/hyperframes/run.mjs doctor --json
```

从任何视频工程目录均可调用本包 `scripts/hyperframes/run.mjs` 的实际路径。脚本从自身位置解析官方 launcher，保留当前工程目录；不依赖设备用户名或安装位置。首次实际运行可能由 npm 下载精确的 `hyperframes@0.8.154`，不会回退到 latest。`--check-env` 不会触发该下载。

入口强制 `HYPERFRAMES_NO_TELEMETRY=1`、`HYPERFRAMES_SKIP_SKILLS=1`、`HYPERFRAMES_NO_UPDATE_CHECK=1`，经官方 `plugin-cli.mjs` 固定 CLI 版本。入口拒绝 `skills`、`upgrade` 和任意 `--script` 转发。上游文档中的自动升级或安装 workflow 指令不适用于此包。

官方 Node helper 必须从真实插件目录按官方 launcher 的 `--script` 约定调用，并继承关闭遥测设置；通用入口不提供任意脚本转发。运行 helper 前检查其独立依赖。

## 可选：作为 Codex 插件安装

项目技能链接与插件安装是两种发现入口；同一环境通常选一种，避免重复显示。官方 manifest 位于 `plugins/hyperframes/.codex-plugin/plugin.json`。

`integration/marketplace.example.json` 是供人工合并的模板，尚未注册。若需要插件安装：

1. 在目标仓库的 `.agents/plugins/marketplace.json` 中合并对应条目；已有 marketplace 保留名称和其他条目，不用模板覆盖整份文件。
2. `source.path` 以 marketplace 所在仓库根目录为基准，保持 `./plugins/hyperframes`。
3. 明确注册这个仓库根目录为 marketplace，再按实际 marketplace 名称执行插件安装；具体命令先以目标设备的 `codex plugin marketplace --help` 和 `codex plugin add --help` 核对。
4. 安装后重新发现技能，核验 10 项是否启用、版本路径是否为 `0.8.154`。

模板仅放在 `integration/`，不会改动目标设备的个人 marketplace 或现有仓库配置。本包没有执行注册、登录或远端发布。

## 功能边界

核心 10 项不含 `general-video`、`faceless-explainer`、`product-launch-video` 等按需 workflow。相应的 captions、transitions、assemble-index 等流程脚本不能当作已经安装。HeyGen 素材、TTS、转写或本地模型仍各有依赖和授权；本包未安装或登录这些服务。

配音压低背景音乐的 `carve.mjs` 另需项目内 `@hyperframes/core`；音频频带提取需 Python 3.9+ 和 numpy；部分创意分析 helper 另需 HyperFrames 包。只安装核心技能不能证明这些分支可运行。

上游 `hyperframes-audio` 的 description 含 HTML 标签写法，通用 Skill 格式验证器会提示尖括号；原文保持不变，须以目标 Codex 的实际技能发现结果判断是否可加载。

## 可重复检查

```sh
make -C scripts/hyperframes check
```

没有 make 的环境可以直接运行：

```sh
node --test scripts/hyperframes/portable.test.mjs
node scripts/hyperframes/verify.mjs
```

检查限定本包官方插件、运行脚本、说明和 10 个指定技能链接，覆盖官方文件 SHA256、技能链接目标、路径逃逸、当前设备个人目录泄漏和启动参数约束；不扫描 `.git`、仓库其他技能或业务工作目录。上游示例中通用的绝对路径保留原文；这些不代表本机配置。浏览器渲染、服务登录、语音识别和额外 workflow 应在目标环境另行验收。
