# WBW Skill - LLM 记事本/备忘录系统

这是一个为 LLM 设计的记事本/备忘录系统，支持三个存储级别：全局、工作区和代理。

> **给 LLM/AI 助手的说明：**
> 
> 如果你是 LLM 或 AI 助手，请按照以下步骤使用此技能：
> 
> 1. **安装此技能**：将此仓库克隆到本地或在 opencode 配置中注册技能路径
> 2. **阅读完整文档**：请查看 [SKILL.md](SKILL.md) 获取完整的 API 文档和使用示例
> 3. **快速开始**：
>    - 使用 `notes` 工具的 `create` 操作创建笔记
>    - 使用 `notes` 工具的 `read` 操作读取笔记
>    - 使用 `notes` 工具的 `search` 操作搜索笔记
>    - 使用 `notes` 工具的 `list` 操作列出笔记
>    - 使用 `notes` 工具的 `update` 操作更新笔记
>    - 使用 `notes` 工具的 `delete` 操作删除笔记
> 4. **跳转语法**：在笔记中使用 `[@jumpto level,agent,id:lineno:column]` 语法创建链接
> 5. **存储级别**：
>    - `global`：全局共享，所有项目可用
>    - `workspace`：工作区级别，仅当前项目可用
>    - `agent`：代理级别，特定代理专用
> 
> **详细 API 文档请查看：[SKILL.md](SKILL.md)**

## 功能特性

- **全局存储**: 跨项目共享的笔记，存储在 `~/.wbw-skill/notes/global/`
- **工作区存储**: 仅当前项目可用的笔记，存储在 `.wbw-skill/notes/workspace/`
- **代理存储**: 特定代理专用的笔记，存储在 `.wbw-skill/notes/agent/<agent-name>/`
- **Markdown 格式**: 笔记以 Markdown 文件存储，支持 YAML 元数据
- **MCP 协议支持**: 可在 opencode/cloud/openclaw 中使用
- **插件支持**: 可作为 opencode 插件使用
- **搜索功能**: 支持按关键词搜索笔记标题和内容
- **跳转语法**: 支持 `[@jumpto]` 语法在笔记间跳转

## 安装

1. 确保已安装 Node.js（版本 14+）
2. 将此技能目录放到合适的位置
3. 在 opencode 配置中注册技能路径

## 配置

### opencode.json 配置

```json
{
  "$schema": "https://opencode.ai/config.json",
  "username": "wbw121124",
  "skills": {
    "paths": [".opencode/skills/wbw-skill"]
  },
  "mcp": {
    "notes": {
      "type": "local",
      "command": ["node", ".opencode/mcp/server.js"],
      "enabled": true
    }
  },
  "plugin": [
    "./.opencode/plugin/notes.js"
  ]
}
```

## 使用方式

### 方式 1：MCP 服务器（推荐）

MCP 服务器提供标准的工具接口，可在 opencode/cloud/openclaw 中使用。

#### 可用工具

| 工具名 | 说明 | 参数 |
|--------|------|------|
| `create_note` | 创建笔记 | level, title, content, agentName |
| `list_notes` | 列出笔记 | level, agentName |
| `read_note` | 读取笔记 | level, id, agentName |
| `update_note` | 更新笔记 | level, id, content, agentName |
| `delete_note` | 删除笔记 | level, id, agentName |
| `search_notes` | 搜索笔记 | query, level, agentName, caseSensitive, wholeWord, regex, searchIn |
| `jumpto` | 跳转到指定位置 | level, id, agentName, lineno, column |
| `parse_jumps` | 解析跳转语法 | content |

#### 示例：创建笔记

```json
{
  "tool": "create_note",
  "arguments": {
    "level": "global",
    "title": "我的待办事项",
    "content": "完成项目文档"
  }
}
```

#### 示例：列出笔记

```json
{
  "tool": "list_notes",
  "arguments": {
    "level": "workspace"
  }
}
```

#### 示例：搜索笔记

```json
{
  "tool": "search_notes",
  "arguments": {
    "query": "重要",
    "searchIn": "all"
  }
}
```

### 方式 2：插件工具

插件提供统一的 `notes` 工具，通过 action 参数执行不同操作。

```json
{
  "tool": "notes",
  "arguments": {
    "action": "create",
    "level": "global",
    "title": "我的笔记",
    "content": "笔记内容"
  }
}
```

#### 示例：搜索笔记

```json
{
  "tool": "notes",
  "arguments": {
    "action": "search",
    "query": "关键词",
    "searchIn": "all"
  }
}
```

### 方式 3：命令行

```bash
# 创建笔记
node notes.js create --level global --title "我的笔记" --content "内容"

# 列出笔记
node notes.js list --level workspace

# 读取笔记
node notes.js read --level agent --id "note-123" --agent-name "my-agent"

# 更新笔记
node notes.js update --level workspace --id "note-123" --content "新内容"

# 删除笔记
node notes.js delete --level global --id "note-123"

# 搜索笔记
node notes.js search --query "关键词"
node notes.js search --query "关键词" --level workspace --search-in title
node notes.js search --query "关键词" --case-sensitive true --whole-word true
node notes.js search --query "模式" --regex true

# 跳转到指定位置
node notes.js jumpto --level global --id "note-123" --lineno 10 --column 5

# 解析跳转语法
node notes.js parse-jumps --content "[@jumpto global,,note-123:10]"
```

## 参数说明

### 基本参数

| 参数 | 说明 | 可选值 | 默认值 |
|------|------|--------|--------|
| `level` | 存储级别 | global, workspace, agent | workspace |
| `title` | 笔记标题 | 任意字符串 | - |
| `content` | 笔记内容 | 任意字符串（支持 Markdown） | - |
| `id` | 笔记 ID | 自动生成的 ID | - |
| `agentName` | 代理名称 | 任意字符串 | - |

### 搜索参数

| 参数 | 说明 | 可选值 | 默认值 |
|------|------|--------|--------|
| `query` | 搜索关键词 | 任意字符串 | - |
| `searchIn` | 搜索范围 | all, title, content | all |
| `caseSensitive` | 区分大小写 | true, false | false |
| `wholeWord` | 全词匹配 | true, false | false |
| `regex` | 正则表达式 | true, false | false |

## 存储位置

| 级别 | 路径 | 说明 |
|------|------|------|
| 全局 | `~/.wbw-skill/notes/global/` | 所有项目共享 |
| 工作区 | `.wbw-skill/notes/workspace/` | 当前项目专用 |
| 代理 | `.wbw-skill/notes/agent/<agent-name>/` | 特定代理专用 |

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

## 跳转语法

支持自定义跳转语法在笔记间链接：

```
[@jumpto level,agent,id:lineno:column]
```

| 部分 | 说明 | 必需 |
|------|------|------|
| `level` | 目标级别：global, workspace, agent | 是 |
| `agent` | 代理名称（代理级别时） | 否 |
| `id` | 目标笔记 ID | 是 |
| `lineno` | 目标行号 | 否 |
| `column` | 目标列号 | 否 |

### 示例

```markdown
参考 [@jumpto global,,note-123] 的内容。

跳转到第 10 行：[@jumpto workspace,,note-456:10]

跳转到指定位置：[@jumpto agent,my-agent,note-789:15:5]
```

## 使用示例

### 场景 1：记录开发笔记

```json
{
  "tool": "create_note",
  "arguments": {
    "level": "workspace",
    "title": "API 设计笔记",
    "content": "## RESTful API 设计原则\n\n1. 使用名词而非动词\n2. 使用复数形式\n3. 版本控制"
  }
}
```

### 场景 2：代理工作记录

```json
{
  "tool": "create_note",
  "arguments": {
    "level": "agent",
    "title": "代码审查指南",
    "content": "## 代码审查要点\n\n- 代码风格一致性\n- 错误处理完善性",
    "agentName": "code-reviewer"
  }
}
```

### 场景 3：全局知识库

```json
{
  "tool": "create_note",
  "arguments": {
    "level": "global",
    "title": "常用命令备忘",
    "content": "## Git 常用命令\n\n- `git commit -m 'message'` - 提交更改"
  }
}
```

### 场景 4：搜索笔记

```json
{
  "tool": "notes",
  "arguments": {
    "action": "search",
    "query": "API",
    "searchIn": "title"
  }
}
```

### 场景 5：高级搜索

```json
{
  "tool": "notes",
  "arguments": {
    "action": "search",
    "query": "TODO|FIXME",
    "regex": true,
    "searchIn": "content"
  }
}
```

## 文件结构

```
wbw-skill/
├── SKILL.md              # opencode 技能定义文件（英文）
├── README.md             # 中文使用文档
├── notes.js              # 笔记管理命令行工具
├── opencode.json         # opencode 配置文件
├── .gitignore            # Git 忽略配置
└── .opencode/
    ├── plugin/
    │   └── notes.js      # opencode 插件
    ├── mcp/
    │   └── server.js     # MCP 服务器
    └── skills/
        └── wbw-skill -> D:\wbw-skill  # junction 点
```

## 技术栈

- Node.js
- MCP (Model Context Protocol)
- opencode 插件系统
- Markdown + YAML

## 许可证

MIT License

## 作者

- 用户名：wbw121124
- 邮箱：wbw121124@163.com