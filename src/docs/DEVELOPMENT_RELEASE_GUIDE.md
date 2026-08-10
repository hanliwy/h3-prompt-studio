# 开发、代码提交与桌面发布指南

本文档用于在不同开发机上统一完成项目拉取、开发、提交、版本管理，以及 Windows、macOS、Linux 桌面安装包的 GitHub Release 发布。

## 1. 项目信息

- GitHub 仓库：`hanliwy/h3-prompt-studio`
- 默认分支：`main`
- Node.js：建议使用 Node.js 24
- 包管理器：npm
- 桌面框架：Electron
- 打包工具：electron-builder
- 自动发布：GitHub Actions

## 2. 新开发机首次配置

### 2.1 安装基础环境

安装以下工具：

- Git
- Node.js 24
- npm（随 Node.js 安装）
- 有仓库写入权限的 GitHub 账号

确认版本：

```bash
git --version
node --version
npm --version
```

### 2.2 配置 Git 身份

每台开发机首次使用 Git 时执行：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的 GitHub 邮箱"
```

查看当前配置：

```bash
git config --global --list
```

### 2.3 克隆项目

推荐使用 SSH：

```bash
git clone git@github.com:hanliwy/h3-prompt-studio.git
cd h3-prompt-studio
```

如果当前网络阻断 GitHub SSH 默认端口 `22`，使用 SSH `443` 端口：

```bash
git clone ssh://git@ssh.github.com:443/hanliwy/h3-prompt-studio.git
cd h3-prompt-studio
```

测试 SSH 身份：

```bash
ssh -T -p 443 git@ssh.github.com
```

认证成功时，应显示当前拥有仓库权限的 GitHub 用户名。如果显示的是其他账号，需要检查该机器使用的 SSH 私钥。

也可以使用 HTTPS：

```bash
git clone https://github.com/hanliwy/h3-prompt-studio.git
cd h3-prompt-studio
```

HTTPS 返回 `403` 时，可能是系统缓存了错误的 GitHub 账号，也可能是当前账号没有仓库写入权限、PAT 权限不足、组织 SSO 未授权或仓库策略限制访问。

### 2.4 安装依赖并验证项目

```bash
npm ci
npm run lint
npm run test
npm run build
```

开发模式：

```bash
npm run dev
```

Electron 桌面模式：

```bash
npm run electron:dev
```

## 3. 本地配置和运行时数据

以下文件属于本机配置或运行时数据，已被 `.gitignore` 忽略，不应提交：

```text
data/config.json
data/gallery.json
data/history.json
data/history/
data/skills.json
data/media/
.env
.env.*
```

`.env.example` 是不包含真实密钥的配置模板，可以正常提交。

其中 `data/config.json` 可能包含 API Key。禁止将真实密钥写入代码、提交记录、Issue、Release 或聊天记录。

这四个 JSON 文件缺失时，服务会在启动时自动生成，因此新开发机不需要从其他机器复制：

- `data/config.json`
- `data/gallery.json`
- `data/history.json`
- `data/skills.json`

提交前检查暂存内容：

```bash
git status
git diff --cached
```

如果密钥曾经被提交或发送到外部，应立即在对应服务商后台撤销并重新生成；仅删除文件不能消除已泄露密钥的风险。

## 4. 日常开发与提交代码

### 4.1 开始开发前同步主分支

```bash
git switch main
git pull --ff-only origin main
```

不要在本机存在未提交修改时盲目执行拉取。先使用 `git status` 确认工作区状态。

### 4.2 创建功能分支

推荐每个功能或修复使用独立分支：

```bash
git switch -c feat/功能名称
```

常用分支前缀：

- `feat/`：新功能
- `fix/`：问题修复
- `docs/`：文档调整
- `build/`：构建和发布配置
- `refactor/`：不改变功能的代码整理

### 4.3 提交前验证

```bash
npm run lint
npm run test
npm run build
git status
```

只暂存本次改动相关文件，避免无关文件混入提交：

```bash
git add 文件路径1 文件路径2
git diff --cached
```

提交示例：

```bash
git commit -m "feat: add prompt workflow"
```

常用提交类型：

- `feat:`：新功能
- `fix:`：问题修复
- `docs:`：文档
- `test:`：测试
- `build:`：构建或发布配置
- `refactor:`：代码重构
- `chore:`：其他维护工作

### 4.4 推送分支

首次推送：

```bash
git push -u origin feat/功能名称
```

后续推送：

```bash
git push
```

推送后在 GitHub 创建 Pull Request，确认检查通过后再合并到 `main`。

### 4.5 合并后更新本地分支

```bash
git switch main
git pull --ff-only origin main
```

确认功能分支已经合并且不再需要后，再删除本地分支：

```bash
git branch -d feat/功能名称
```

删除远程分支会影响共享仓库，应在确认无其他人使用后操作。

## 5. 修改远程仓库地址

查看远程地址：

```bash
git remote -v
```

`origin` 已存在时，应修改地址而不是再次执行 `git remote add origin`。

切换到 SSH `443`：

```bash
git remote set-url origin ssh://git@ssh.github.com:443/hanliwy/h3-prompt-studio.git
```

切换到 HTTPS：

```bash
git remote set-url origin https://github.com/hanliwy/h3-prompt-studio.git
```

## 6. 本地打包桌面应用

安装依赖后，可以按当前系统打包。

### 6.1 Windows

在 Windows 开发机执行：

```bash
npm run dist:win
```

生成：

- NSIS 安装版 `.exe`
- Portable 便携版 `.exe`

### 6.2 macOS

在 macOS 开发机执行：

```bash
npm run dist:mac
```

生成：

- Intel x64 `.dmg` 和 `.zip`
- Apple Silicon arm64 `.dmg` 和 `.zip`

未配置 Apple 开发者签名和公证时，其他用户首次打开可能看到“身份不明的开发者”等系统提示。

### 6.3 Linux

在 Linux 开发机执行：

```bash
npm run build
npx electron-builder --linux
```

生成 x64 `.AppImage`。

### 6.4 输出目录

electron-builder 生成的安装包默认输出到：

```text
release/
```

`release/` 是构建产物，不应提交到 Git。

不建议依赖单台开发机跨平台打包。正式发布应使用 GitHub Actions 分别在 Windows、macOS 和 Ubuntu 环境构建。

## 7. GitHub Tag 与 Release 发布

### 7.1 自动发布机制

工作流文件：

```text
.github/workflows/release.yml
```

推送名称以 `v` 开头的 Tag 后，GitHub Actions 会在以下环境并行构建：

- `windows-latest`
- `macos-latest`
- `ubuntu-latest`

构建成功后，electron-builder 会把 Windows、macOS、Linux 安装包上传到对应的 GitHub Release。

Actions 页面显示的工作流名称为 `Build Desktop Release (Windows, macOS & Linux)`。

当前 Release 工作流只执行 `npm ci`、`npm run build` 和桌面打包，**不会自动执行 `npm run lint` 与 `npm run test`**。正式发布前的类型检查和测试由发布者在本地手动完成，不能仅凭 Release 工作流成功判断全部测试已经通过。

### 7.2 版本号规则

项目采用语义化版本：

```text
主版本.次版本.修订版本
```

例如：

- `1.0.1`：兼容性问题修复
- `1.1.0`：新增兼容功能
- `2.0.0`：包含不兼容变更

Git Tag 使用相同版本号并加 `v` 前缀，例如 `v1.0.1`。

### 7.3 推荐发布流程

发布前必须确认：

- 工作区没有未提交改动
- `main` 已同步远程最新代码
- 测试、类型检查和生产构建通过
- `package.json` 与 `package-lock.json` 中的版本一致
- 本次 Tag 尚未存在

执行：

```bash
git switch main
git pull --ff-only origin main
npm ci
npm run lint
npm run test
npm run build
git status
```

根据改动类型更新版本。补丁版本示例：

```bash
npm version patch
```

其他版本类型：

```bash
npm version minor
npm version major
```

在 npm 默认配置下，`npm version` 会更新版本文件、创建版本提交，并生成类似 `v1.0.1` 的 Tag。用户级 npm 配置可能改变 Tag 前缀，因此推送前必须确认实际 Tag 仍以 `v` 开头：

```bash
git log -1 --decorate
git tag --list --sort=-version:refname
```

推送版本提交和 Tag：

```bash
git push origin main --follow-tags
```

也可以手动创建版本 Tag：

```bash
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

手动创建 Tag 前，应先确保 `package.json` 的版本已经更新为 `1.0.1`。

### 7.4 查看和发布 Release

1. 打开 GitHub 仓库的 **Actions** 页面。
2. 查看 `Build Desktop Release` 工作流。
3. 确认 Windows、macOS、Ubuntu 三个任务全部成功。
4. 打开仓库的 **Releases** 页面。
5. 检查安装包名称、平台和架构。
6. 当前配置没有显式要求创建 Draft，不能假设发布前一定存在人工审核步骤；应立即检查 Release 的实际发布状态和附件。

不要在构建任务仍运行时重复创建同版本 Tag。

工作流同时支持 `workflow_dispatch` 手动触发，但正式发布推荐只使用 `v*` Tag 触发。当前打包命令包含 `--publish always`，不要在 `main` 或普通功能分支上随意手动运行发布工作流；手动触发仅用于维护者明确了解目标 Ref 和发布影响时排障。

### 7.5 已发布 Tag 的处理原则

正式发布后不要移动、覆盖或复用同名 Tag。发现问题时应修复代码并发布新版本，例如从 `v1.0.1` 更新到 `v1.0.2`。

删除远程 Tag 或 Release 会影响其他开发机和用户，操作前必须和维护者确认。

## 8. GitHub Actions 发布故障排查

### 8.1 工作流没有启动

检查：

```bash
git tag --list
git ls-remote --tags origin
```

确认 Tag 已推送，并且名称以 `v` 开头，例如 `v1.0.1`。

### 8.2 Release 上传返回 403

检查仓库：

```text
Settings → Actions → General → Workflow permissions
```

工作流需要 `contents: write` 权限。仓库策略还必须允许 `GITHUB_TOKEN` 写入 Release。

### 8.3 HTTPS 推送返回 403

如果出现：

```text
Permission to hanliwy/h3-prompt-studio.git denied to 某账号
```

优先检查当前登录账号、仓库协作者权限、PAT 权限、组织 SSO 授权和仓库访问策略。确认是本机缓存了错误账号后，再清理 GitHub 凭据重新登录，或者切换到绑定正确账号的 SSH Key。

### 8.4 SSH 端口 22 被阻断

如果出现：

```text
Connection closed ... port 22
```

改用 SSH `443`：

```bash
git remote set-url origin ssh://git@ssh.github.com:443/hanliwy/h3-prompt-studio.git
ssh -T -p 443 git@ssh.github.com
git push
```

### 8.5 `remote origin already exists`

不要重复添加 `origin`，改用：

```bash
git remote set-url origin 新地址
```

### 8.6 Tag 已存在

本地 Tag 已存在时：

```bash
git show v1.0.1
```

远程 Tag 已存在时，不要强制覆盖。更新项目版本并创建新的 Tag。

## 9. 提交与发布检查清单

### 普通代码提交

- [ ] 已同步最新 `main`
- [ ] 使用独立功能分支
- [ ] 未提交 API Key 或本机运行数据
- [ ] `npm run lint` 通过
- [ ] `npm run test` 通过
- [ ] `npm run build` 通过
- [ ] 已检查 `git diff --cached`
- [ ] 提交信息清楚描述改动
- [ ] 已推送分支并创建 Pull Request

### 正式 Release

- [ ] Pull Request 已合并到 `main`
- [ ] 本地 `main` 与远程同步
- [ ] 工作区干净
- [ ] 完整测试和构建通过
- [ ] 版本号符合语义化版本规则
- [ ] Tag 与项目版本一致
- [ ] Tag 名称以 `v` 开头
- [ ] Windows、macOS、Ubuntu Actions 全部成功
- [ ] Release 附件的平台和架构完整
- [ ] Release 内容不包含配置文件、密钥或个人运行数据
