# ⚡ DashTick - 闪小条

基于 [Tauri 2](https://v2.tauri.app/) 的桌面快速记录应用，用于随时捕捉待办事项和灵感想法。

## ✨ 功能特性

- **快捷唤出** — `Alt+Space` 一键呼出/隐藏，不打断工作流
- **智能输入** — 自动识别中文时间关键词（如"明天下午3点"），自动归类为待办
- **待办提醒** — 截止前 5 分钟 Windows 原生通知提醒
- **灵感记录** — 无时间关键词的内容自动归为灵感，支持 Markdown 渲染
- **图片粘贴** — `Ctrl+V` 直接粘贴截图到输入框，自动嵌入内容
- **窗口缩放** — 拖拽窗口四边或四角自由调整大小
- **详情面板** — 点击条目查看完整 Markdown 内容
- **系统托盘** — 关闭时最小化到托盘，后台常驻
- **窗口记忆** — 自动保存窗口位置，下次打开恢复上次位置
- **单实例** — 仅允许运行一个实例，防止重复打开

## 📥 下载安装

前往 [Releases 页面](https://github.com/interesting-sudo/dashtick/releases) 下载最新版本的安装包（`DashTick_x.x.x_x64-setup.exe`），双击即可安装。

> 首次运行需要 WebView2 运行时，Windows 10/11 通常已预装。如未安装，程序会自动下载。

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Zustand + Vite 6 + Tailwind CSS 4 |
| 后端 | Rust + Tauri 2 + rusqlite (SQLite) |
| 插件 | global-shortcut / notification / shell |

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/tools/install) >= 1.77
- Windows 10+ (WebView2 运行时)

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/interesting-sudo/dashtick.git
cd dashtick

# 安装前端依赖
npm install

# 启动开发模式（自动编译 Rust + 启动 Vite）
npx tauri dev

# 生产构建（生成安装包）
npx tauri build
```

## 📁 项目结构

```
dashtick/
├── src/                        # 前端源码
│   ├── components/
│   │   ├── InputBar.tsx        # 智能输入框（支持粘贴图片）
│   │   ├── TaskList.tsx        # 待办列表
│   │   ├── IdeaList.tsx        # 灵感列表
│   │   ├── TabSwitch.tsx       # 标签切换
│   │   ├── DetailPanel.tsx     # Markdown 详情面板
│   │   └── TimePicker.tsx      # 时间选择器
│   ├── lib/
│   │   └── timeParser.ts       # 中文时间表达式解析器
│   ├── store/
│   │   └── useStore.ts         # Zustand 状态管理
│   ├── App.tsx                 # 根组件
│   └── main.tsx                # 入口
├── src-tauri/                  # Rust 后端
│   ├── src/
│   │   ├── main.rs             # Tauri 命令注册与初始化
│   │   ├── db.rs               # SQLite 数据库操作
│   │   ├── models.rs           # 数据结构定义
│   │   ├── reminders.rs        # 后台提醒线程
│   │   ├── shortcuts.rs        # 全局快捷键
│   │   └── tray.rs             # 系统托盘与窗口位置管理
│   ├── capabilities/
│   │   └── default.json        # Tauri v2 权限配置
│   └── tauri.conf.json         # Tauri 应用配置
└── scripts/                    # 图标转换工具
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Alt+Space` | 唤出/隐藏窗口 |
| `Enter` | 创建待办或灵感 |
| `Ctrl+V` | 粘贴图片到输入框 |
| `Esc` | 隐藏窗口 |

## 💡 使用技巧

**智能分类**：输入中文时间关键词自动归为待办，否则归为灵感：

- `买牛奶 明天下午3点` → 创建待办，截止时间明天 15:00
- `开会 下周一上午10点` → 创建待办，截止时间下周一 10:00
- `写周报 3小时后` → 创建待办，截止时间 3 小时后
- `突然想到个好点子` → 创建灵感记录

**图片粘贴**：截图后直接 `Ctrl+V` 粘贴到输入框，图片会自动嵌入内容中。

**窗口缩放**：拖拽窗口四边或四角调整大小，支持最小 300×400。

支持的时间关键词：今天、明天、后天、下周、周X、X分钟后、X小时后、上午/下午/晚上 + 时间

## 📝 License

MIT
