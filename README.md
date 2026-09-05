# WBW Skill - LLM 记事本/备忘录系统

这是一个为 LLM 设计的记事本/备忘录系统，支持三个存储级别：全局、工作区和代理。

## 功能特性

- **全局存储**: 跨项目共享的笔记，存储在 `~/.wbw-skill/notes/global/`
- **工作区存储**: 仅当前项目可用的笔记，存储在 `.wbw-skill/notes/workspace/`
- **代理存储**: 特定代理专用的笔记，存储在 `.wbw-skill/notes/agent/<agent-name>/`
- **Markdown 格式**: 笔记以 Markdown 文件存储，支持 YAML 元数据
- **命令行工具**: 通过 Node.js 脚本管理笔记

## 安装

1. 确保已安装 Node.js（版本 14+）
2. 将此技能目录放到合适的位置
3. 在 opencode 配置中注册技能路径

## 快速开始

### 创建笔记

```bash
# 创建全局笔记
node notes.js create --level global --title "我的待办事项" --content "完成项目文档"

# 创建工作区笔记
node notes.js create --level workspace --title "项目笔记" --content "记录开发过程中的想法"

# 创建代理笔记
node notes.js create --level agent --title "代理专属笔记" --content "代理的工作记录" --agent-name "my-agent"
```

### 查看笔记

```bash
# 列出全局笔记
node notes.js list --level global

# 列出工作区笔记
node notes.js list --level workspace

# 列出代理笔记
node notes.js list --level agent --agent-name "my-agent"
```

### 读取笔记

```bash
# 读取全局笔记
node notes.js read --level global --id "note-1234567890"

# 读取工作区笔记
node notes.js read --level workspace --id "note-1234567890"

# 读取代理笔记
node notes.js read --level agent --id "note-1234567890" --agent-name "my-agent"
```

### 更新笔记

```bash
# 更新全局笔记
node notes.js update --level global --id "note-1234567890" --content "更新后的内容"

# 更新工作区笔记
node notes.js update --level workspace --id "note-1234567890" --content "更新后的内容"

# 更新代理笔记
node notes.js update --level agent --id "note-1234567890" --content "更新后的内容" --agent-name "my-agent"
```

### 删除笔记

```bash
# 删除全局笔记
node notes.js delete --level global --id "note-1234567890"

# 删除工作区笔记
node notes.js delete --level workspace --id "note-1234567890"

# 删除代理笔记
node notes.js delete --level agent --id "note-1234567890" --agent-name "my-agent"
```

## 参数说明

| 参数 | 说明 | 必需 | 默认值 |
|------|------|------|--------|
| `--level` | 存储级别：global、workspace、agent | 否 | workspace |
| `--title` | 笔记标题 | 创建时必需 | - |
| `--content` | 笔记内容 | 创建/更新时必需 | - |
| `--id` | 笔记 ID | 读取/更新/删除时必需 | - |
| `--agent-name` | 代理名称 | agent 级别时必需 | - |

## 笔记格式

每个笔记都是一个 Markdown 文件，包含 YAML 前置元数据：

```markdown
---
id: "note-1234567890-abc123def"
title: "笔记标题"
created: "2026-09-05T12:00:00.000Z"
updated: "2026-09-05T12:00:00.000Z"
level: "global"
---

这里是笔记的内容...

支持 Markdown 格式：
- **粗体**
- *斜体*
- `代码`
- 列表
- 等等
```

## 存储位置

| 级别 | 路径 | 说明 |
|------|------|------|
| 全局 | `~/.wbw-skill/notes/global/` | 所有项目共享 |
| 工作区 | `.wbw-skill/notes/workspace/` | 当前项目专用 |
| 代理 | `.wbw-skill/notes/agent/<agent-name>/` | 特定代理专用 |

## 与 opencode 集成

### 方法 1：使用 junction 点（Windows）

```cmd
mklink /J .opencode\skills\wbw-skill D:\wbw-skill
```

### 方法 2：使用软链接（Linux/macOS）

```bash
ln -s /path/to/wbw-skill .opencode/skills/wbw-skill
```

### 方法 3：配置技能路径

在 `opencode.json` 中添加：

```json
{
  "skills": {
    "paths": ["path/to/wbw-skill"]
  }
}
```

## 使用示例

### 场景 1：记录开发笔记

```bash
# 创建开发笔记
node notes.js create --level workspace --title "API 设计笔记" --content "
## RESTful API 设计原则

1. 使用名词而非动词
2. 使用复数形式
3. 版本控制
4. 状态码规范
"

# 列出工作区笔记
node notes.js list --level workspace
```

### 场景 2：代理工作记录

```bash
# 为代码审查代理创建笔记
node notes.js create --level agent --title "代码审查指南" --content "
## 代码审查要点

- 代码风格一致性
- 错误处理完善性
- 测试覆盖率
- 文档完整性
" --agent-name "code-reviewer"

# 查看代理笔记
node notes.js list --level agent --agent-name "code-reviewer"
```

### 场景 3：全局知识库

```bash
# 创建全局知识库笔记
node notes.js create --level global --title "常用命令备忘" --content "
## Git 常用命令

- `git commit -m 'message'` - 提交更改
- `git push origin main` - 推送到远程
- `git pull` - 拉取最新代码
"
```

## 错误处理

- 如果笔记不存在，会显示错误信息：`Note not found: <id>`
- 如果缺少必要参数，会显示相应的错误提示
- 所有错误都会以 JSON 格式输出，便于程序处理

## 开发说明

### 文件结构

```
wbw-skill/
├── SKILL.md          # opencode 技能定义文件（英文）
├── README.md         # 中文使用文档
├── notes.js          # 笔记管理脚本
├── .gitignore        # Git 忽略配置
└── .opencode/        # opencode 配置目录
    └── skills/
        └── wbw-skill -> D:\wbw-skill  # junction 点
```

### 技术栈

- Node.js
- 原生 fs 模块（文件系统操作）
- 原生 path 模块（路径处理）
- 原生 os 模块（系统信息）

### 扩展开发

如需扩展功能，可以：

1. 在 `NotesManager` 类中添加新方法
2. 在 `main` 函数中添加新的命令处理
3. 修改笔记格式（如添加标签、分类等）

## 许可证

MIT License

## 作者

- 用户名：wbw121124
- 邮箱：wbw121124@163.com