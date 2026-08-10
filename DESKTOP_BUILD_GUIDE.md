# 🚀 MiniMax-H3 视频提示词大师 - 桌面端打包与 GitHub 发布指南

本指南将帮助你将 **MiniMax-H3 视频 Prompt 提示词大师** 打包为原生的 **Windows (.exe / 免安装版)** 和 **macOS (.dmg / .app 双架构)** 桌面应用程序，并提供 **GitHub Actions 一键自动打包发布** 流程。

---

## 目录
1. [项目架构说明](#1-项目架构说明)
2. [快捷打包指令说明](#2-快捷打包指令说明)
3. [本地打包步骤](#3-本地打包步骤)
   - [在 Windows 上打包 .exe](#在-windows-上打包-exe)
   - [在 macOS 上打包 .dmg](#在-macos-上打包-dmg)
4. [GitHub 自动化一键打包 (强烈推荐)](#4-github-自动化一键打包-强烈推荐)
5. [更换图标与应用名称](#5-更换图标与应用名称)
6. [常见问题 FAQ](#6-常见问题-faq)

---

## 1. 项目架构说明

本项目采用 **Electron + Node.js (Express) + React (Vite)** 的高性能全栈架构：
- **前端界面**：基于 React 19 + Tailwind CSS 构建，渲染在 Electron 的桌面主窗口中。
- **后台服务**：内部打包了内置的 Express 后台服务 (`dist/server.cjs`)，随客户端启动时自动在后台启动，无需用户配置繁琐的 Node.js 环境。
- **跨平台兼容**：完美支持 Windows 10/11 (64位) 和 macOS (Intel 芯片 与 Apple Silicon M1/M2/M3/M4 芯片)。

---

## 2. 快捷打包指令说明

项目中已配置好以下 `npm` 脚本指令（详见 `package.json`）：

| 命令 | 说明 |
| :--- | :--- |
| `npm run build` | 编译前端静态资源与后端 Express 打包文件 (`dist/`) |
| `npm run electron:dev` | 编译并本地启动 Electron 桌面版预览测试 |
| `npm run dist:win` | 打包 Windows 安装包 (`.exe` 安装版 + 免安装 Portable 版) |
| `npm run dist:mac` | 打包 macOS 安装包 (`.dmg` + `.zip` 支持 M系列/Intel) |
| `npm run dist:all` | 同时触发全平台打包 |

---

## 3. 本地打包步骤

### 准备工作：
1. 确保已安装 **Node.js (>= 18.0.0)** 以及 **npm** / **pnpm**。
2. 安装打包依赖项（Electron 与 Electron-Builder）：
   ```bash
   npm install --save-dev electron electron-builder
   ```

---

### 在 Windows 上打包 .exe
在 Windows 终端（CMD / PowerShell / Git Bash）中运行：

```bash
# 1. 编译项目并生成 Windows 桌面应用
npm run dist:win
```

* **打包产物目录**：项目根目录下的 `release/`
  - `MiniMax-H3 PromptMaster Setup 1.0.0.exe` (标准 Windows 安装包)
  - `MiniMax-H3 PromptMaster 1.0.0.exe` (便携免安装单文件)

---

### 在 macOS 上打包 .dmg
在 macOS 终端 (Terminal) 中运行：

```bash
# 1. 编译项目并生成 macOS 桌面应用
npm run dist:mac
```

* **打包产物目录**：项目根目录下的 `release/`
  - `MiniMax-H3 PromptMaster-1.0.0.dmg` (含 Universal 双架构 / Apple Silicon & Intel)
  - `MiniMax-H3 PromptMaster-1.0.0-mac.zip`

---

## 4. GitHub 自动化一键打包 (强烈推荐)

> 💡 **无需在 Mac 和 Windows 电脑上分别编译！** 
> 借助 GitHub Actions，无论你在什么操作系统上，只需向 GitHub 推送一个版本 Tag，GitHub 云端虚拟机会自动分别在 Windows 和 macOS 系统上为你打包，并将二进制 `.exe` 和 `.dmg` 安装包自动上传至 **GitHub Releases** 页面！

### 使用方法：

#### 步骤 1：将代码推送至你的 GitHub 仓库
```bash
git add .
git commit -m "feat: 配置桌面打包与 GitHub 工作流"
git push origin main
```

#### 步骤 2：打标签 (Tag) 并推送以触发自动发布
```bash
# 1. 创建版本号标签（必须以 v 开头，例如 v1.0.0）
git tag v1.0.0

# 2. 推送标签到 GitHub
git push origin v1.0.0
```

#### 步骤 3：查看打包进度与下载成果
1. 打开你的 GitHub 仓库页面，点击 **Actions** 选项卡。
2. 你会看到名为 **`Build Desktop Release (Windows & macOS)`** 的工作流正在自动并行构建 Windows 与 macOS 应用。
3. 构建完成后，前往仓库右侧的 **Releases** 页面，即可直接下载编译好的 `.exe` 和 `.dmg` 文件！

---

## 5. 更换图标与应用名称

### 修改应用基本信息
打开 `electron-builder.json` 文件：
```json
{
  "appId": "com.minimax.h3.promptmaster",
  "productName": "你的自定义应用名称",
  "copyright": "Copyright © 2026 Your Name"
}
```

### 设置应用图标 (Icon)
1. 在 `public/` 目录下放置你的图标图片：
   - **Windows**：需要 `.ico` 格式（如 `public/icon.ico`，推荐尺寸 256x256）。
   - **macOS**：需要 `.icns` 格式（如 `public/icon.icns`，推荐尺寸 512x512）。
2. 在 `electron-builder.json` 中添加图标指定：
   ```json
   "win": {
     "icon": "public/icon.ico"
   },
   "mac": {
     "icon": "public/icon.icns"
   }
   ```

---

## 6. 常见问题 FAQ

#### Q1: 在 macOS 打开 `.dmg` 安装后提示“已损坏，无法打开”或“来自身份不明的开发者”？
* **原因**：这是 macOS 默认的安全机制（Gatkeeper），因为未购买 Apple 开发者证书签名。
* **解决方法**：
  1. 用户可在【系统设置】->【隐私与安全性】中选择“仍要打开”。
  2. 或者在 macOS 终端中运行指令解锁：
     ```bash
     sudo xattr -rd com.apple.quarantine /Applications/MiniMax-H3\ PromptMaster.app
     ```

#### Q2: 端口冲突会引发崩溃或白屏吗？
* **解答（已自动适配）**：**不会白屏！** 本系统已内置「智能端口碰撞检测与自动退避机制」。如果默认的 `3000` 端口已经被本地其他软件（如 React、Vue 或其他 Node 服务）占用，系统启动时会自动扫描并顺延切换绑定到空闲端口（例如 `3001`、`3002` ...），并在终端打印备用端口链接。

#### Q3: 如果不打包为桌面客户端，可以直接在浏览器中访问吗？
* **解答**：**完全可以！** 如果不打包为独立的 Windows `.exe` 或 Mac `.dmg` 桌面应用，您只需在终端运行 `npm run dev` 或 `npm start`，然后在 Chrome、Edge、Safari 等本地浏览器中打开提示的地址（如 `http://localhost:3000` 或自动顺延的端口）即可享用全部功能。

---
🎉 **祝开发与发布顺利！** 如有疑问，欢迎随时提交 Issue 或 PR。
