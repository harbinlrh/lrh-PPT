# HyperFrames 固定版本核心包

以下规则仅适用于本仓库中使用 `plugins/hyperframes/` 的视频与技能任务；不改变仓库其他任务的规则。

- 官方源码在 `plugins/hyperframes/`，固定 `0.8.154`，仅包含核心 10 项。把该目录视为只读；先运行 `node scripts/hyperframes/verify.mjs` 核验来源。
- `.agents/skills/` 是包内相对符号链接。读取技能后，先解析真实路径；插件根目录是 `plugins/hyperframes/`，存在官方 `.codex-plugin/plugin.json`。应用 `skills/hyperframes/references/plugin-installation.md` 的插件规则，不采用 standalone 安装/更新规则。
- 在用户的视频工程目录中，调用本包 `scripts/hyperframes/run.mjs` 的实际路径替代文档中的 `npx hyperframes`。入口动态寻找包根目录，固定 CLI 版本、关闭遥测和自动技能更新。不要绕过入口执行 `skills`、`upgrade` 或 `npx skills add`。
- `node scripts/hyperframes/run.mjs --check-env` 只检查环境。缺少依赖、浏览器、授权或额外 workflow 时标为 `REVIEW`，说明缺项；不得自动安装额外工作流、模型或登录账号。
- 用户明确需要某个已随包提供的 Node helper 时，按官方 plugin-cli 的 `--script` 约定执行，同时设置 `HYPERFRAMES_NO_TELEMETRY=1`；先确认脚本真实路径位于本包，运行前检查其独立依赖。通用入口本身不转发任意脚本。
- 核心包不承诺自动完成全部十类视频 workflow。缺失 workflow 的引用是上游按需安装设计；本包不能因此静默扩展安装范围。
- 输入素材、输出、预览、缓存和临时文件放在用户工程或临时目录；凭据由目标设备的认证机制管理，不写入本包、Git 或交付日志。
- 发布、发送、云渲染、模型计费和修改外部系统仍须满足用户当前明确授权。只根据实际检查报告安装、发现、依赖或渲染状态。
