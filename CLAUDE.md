# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

DashTick（闪小条）是一个桌面快速记录应用，用于捕捉待办和灵感。基于 Tauri 2 构建（Rust 后端 + Web 前端），UI 为 420×560px 的无边框置顶小窗口，通过 Alt+Space 切换显示。数据存储在本地 SQLite 数据库。界面语言为中文。

## 常用命令

```bash
# 启动桌面开发环境（自动启动 Vite + Tauri）
npx tauri dev

# 仅启动前端开发服务器（端口 1420）
npm run dev

# TypeScript 类型检查 + Vite 生产构建
npm run build

# Tauri 生产构建（生成安装包）
npx tauri build

# 图标转换工具
node scripts/convert-icons.js   # SVG → PNG
node scripts/create-ico.js      # PNG → ICO
```

## 技术栈

- **前端**: React 19 + TypeScript + Zustand 5 + Vite 6 + Tailwind CSS 4
- **后端**: Rust (Tauri 2) + rusqlite (SQLite) + tokio
- **Tauri 插件**: global-shortcut、notification、shell

## 架构要点

### 前后端通信
所有数据操作通过 Tauri `invoke()` 调用。Zustand store（`src/store/useStore.ts`）中的 action 调用 Rust 命令处理器（`src-tauri/src/main.rs`）。TypeScript 接口（`Task`、`Idea`）与 Rust 结构体（`src-tauri/src/models.rs`）镜像。

### 智能输入路由
`InputBar` 组件使用 `timeParser.ts` 中的 `hasTimeKeyword()` 判断输入类型：包含中文时间关键词（如"明天下午3点"）→ 创建待办（自动解析为 ISO 8601）；否则 → 创建灵感。

### 自动提醒
创建带截止时间的待办时，`db.rs` 自动在截止前 5 分钟创建提醒。`reminders.rs` 中的后台线程每 15 秒轮询，通过 Tauri 通知插件发送 Windows 原生通知。

### 数据库
SQLite 三张表：`tasks`（id, content, due_date, is_done, created_at, updated_at）、`ideas`（id, content, tags, created_at, updated_at）、`reminders`（id, task_id, remind_at, notified）。数据库文件位于平台应用数据目录 `dashtick.db`。

### 窗口行为
无边框、置顶、不在任务栏显示、不可调整大小、默认隐藏。自定义标题栏通过 `data-tauri-drag-region` 和 `startDragging()` 实现拖拽。关闭时隐藏到系统托盘而非退出。

## 样式约定

- 主样式文件：`src/index.css`（Tailwind 导入 + 自定义 CSS 类）
- 待办主题色：靛蓝色（#6366f1）
- 灵感主题色：青色（#06b6d4 / #0891b2）

## 开发注意事项

- TypeScript 严格模式开启（`noUnusedLocals`、`noUnusedParameters`、`noFallthroughCasesInSwitch`）
- 无 ESLint/Prettier 配置，依赖 TypeScript 编译器检查代码质量
- 无测试框架配置
- Rust 命令处理器需在 `main.rs` 的 `invoke_handler` 中注册
