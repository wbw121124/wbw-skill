# WBW Skill 开发计划

## 当前状态

- [x] 基本 CRUD 操作
- [x] 三级存储（全局/工作区/代理）
- [x] MCP 服务器
- [x] 插件支持
- [x] 搜索功能
- [x] 跳转语法

---

## Phase 1 - 基础增强

**目标时间：1-2 周**

### 1.1 标签系统

**描述：** 为笔记添加标签，支持按标签过滤和搜索

**功能：**
- 创建笔记时添加标签：`--tags "tag1,tag2,tag3"`
- 按标签列出笔记：`--tag "tag1"`
- 在搜索中支持按标签过滤
- 显示笔记的标签信息

**实现：**
- 在 frontmatter 中添加 `tags` 字段
- 更新 `createNote` 方法支持标签参数
- 添加 `listNotesByTag` 方法
- 更新 `searchNotes` 方法支持标签搜索

**示例：**
```bash
# 创建带标签的笔记
node notes.js create --level workspace --title "会议记录" --content "内容" --tags "会议,工作"

# 按标签列出笔记
node notes.js list --level workspace --tag "会议"

# 搜索带标签的笔记
node notes.js search --query "关键词" --tag "工作"
```

---

### 1.2 笔记模板

**描述：** 预定义常用笔记模板，快速创建格式化笔记

**内置模板：**
- `meeting` - 会议记录
- `todo` - 待办事项
- `daily` - 日记/日志
- `idea` - 想法/灵感
- `bug` - Bug 报告
- `feature` - 功能需求

**功能：**
- 使用模板创建笔记：`--template meeting`
- 列出可用模板：`node notes.js templates`
- 创建自定义模板

**示例：**
```bash
# 使用模板创建笔记
node notes.js create --level workspace --template meeting --title "周会记录"

# 列出可用模板
node notes.js templates
```

---

### 1.3 排序选项

**描述：** 支持按不同字段排序笔记列表

**排序选项：**
- `created` - 按创建时间（默认）
- `updated` - 按更新时间
- `title` - 按标题字母顺序
- `id` - 按 ID 顺序

**功能：**
- 列出笔记时指定排序方式
- 支持升序/降序排列

**示例：**
```bash
# 按更新时间排序（最新在前）
node notes.js list --level workspace --sort updated --order desc

# 按标题排序（字母顺序）
node notes.js list --level workspace --sort title --order asc
```

---

### 1.4 批量操作

**描述：** 支持同时操作多个笔记

**批量操作：**
- 批量删除
- 批量移动（跨级别）
- 批量添加标签
- 批量导出

**功能：**
- 按 ID 列表批量操作
- 按标签批量操作
- 按搜索结果批量操作

**示例：**
```bash
# 批量删除
node notes.js batch-delete --ids "note-123,note-456,note-789"

# 按标签批量删除
node notes.js batch-delete --tag "过期"

# 批量添加标签
node notes.js batch-tag --ids "note-123,note-456" --add-tags "重要"
```

---

## Phase 2 - 高级功能

**目标时间：2-3 周**

### 2.1 导入/导出

**描述：** 支持笔记的导入和导出功能

**导出格式：**
- 单个笔记导出为 Markdown
- 批量导出为 ZIP 压缩包
- 导出为 JSON 格式（包含元数据）

**导入格式：**
- 从 Markdown 文件导入
- 从 JSON 文件导入
- 从 ZIP 压缩包批量导入

**功能：**
- 导出笔记到文件
- 从文件导入笔记
- 支持批量导入/导出

**示例：**
```bash
# 导出单个笔记
node notes.js export --id "note-123" --output "./exports/"

# 导出所有工作区笔记
node notes.js export --level workspace --output "./exports/workspace.zip"

# 导入笔记
node notes.js import --file "./imports/note.md"
node notes.js import --file "./imports/notes.zip"
```

---

### 2.2 版本历史

**描述：** 保存笔记修改历史，支持查看历史和回滚

**功能：**
- 每次更新自动保存历史版本
- 查看笔记历史版本列表
- 查看特定历史版本内容
- 回滚到指定历史版本

**存储：**
- 历史版本存储在 `.wbw-skill/history/<note-id>/` 目录
- 保留最近 N 个版本（可配置）

**示例：**
```bash
# 查看笔记历史
node notes.js history --level workspace --id "note-123"

# 查看特定版本
node notes.js history --level workspace --id "note-123" --version 3

# 回滚到指定版本
node notes.js rollback --level workspace --id "note-123" --version 2
```

---

### 2.3 笔记统计

**描述：** 显示笔记相关统计信息

**统计信息：**
- 笔记总数（按级别分）
- 总字数/字符数
- 最近创建的笔记
- 最近更新的笔记
- 标签使用统计
- 存储空间占用

**功能：**
- 显示全局统计
- 显示特定级别统计
- 显示标签统计

**示例：**
```bash
# 显示全局统计
node notes.js stats

# 显示工作区统计
node notes.js stats --level workspace

# 显示标签统计
node notes.js stats --tags
```

---

## Phase 3 - 代码质量

**目标时间：1-2 周**

### 3.1 TypeScript 迁移

**描述：** 将代码迁移到 TypeScript，提供类型安全

**迁移范围：**
- `notes.js` → `src/cli.ts`
- `.opencode/mcp/server.js` → `src/mcp/server.ts`
- `.opencode/plugin/notes.js` → `src/plugin/index.ts`

**类型定义：**
- `Note` - 笔记类型
- `NoteMetadata` - 笔记元数据类型
- `SearchOptions` - 搜索选项类型
- `JumpTarget` - 跳转目标类型

**配置：**
- 添加 `tsconfig.json`
- 添加 TypeScript 依赖
- 配置构建脚本

---

### 3.2 单元测试

**描述：** 添加完整的单元测试覆盖

**测试框架：** Jest 或 Vitest

**测试范围：**
- `NotesManager` 类测试
- `JumpToParser` 类测试
- CLI 命令测试
- MCP 服务器测试

**测试用例：**
- 创建/读取/更新/删除笔记
- 搜索功能
- 跳转语法解析
- 错误处理

**示例结构：**
```
tests/
├── NotesManager.test.ts
├── JumpToParser.test.ts
├── cli.test.ts
└── mcp.test.ts
```

---

### 3.3 CI/CD

**描述：** 添加 GitHub Actions 自动化工作流

**工作流：**
- `test.yml` - 运行单元测试
- `lint.yml` - 代码风格检查
- `release.yml` - 自动发布到 npm

**触发条件：**
- Push 到 main 分支
- Pull Request
- 创建 Release

**示例配置：**
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm test
```

---

### 3.4 API 文档

**描述：** 生成完整的 API 文档

**工具：** TypeDoc 或 JSDoc

**文档内容：**
- 类型定义
- 方法说明
- 参数说明
- 使用示例

**生成方式：**
```bash
npm run docs
```

---

## 里程碑

| Phase | 完成时间 | 主要交付物 |
|-------|----------|-----------|
| Phase 1 | 第 2 周末 | 标签系统、模板、排序、批量操作 |
| Phase 2 | 第 5 周末 | 导入/导出、版本历史、统计 |
| Phase 3 | 第 7 周末 | TypeScript、测试、CI/CD、文档 |

---

## 优先级说明

- 🔥 高优先级：核心功能增强，用户需求强烈
- ⭐ 中优先级：提升用户体验，锦上添花
- 💡 低优先级：长期规划，可后续迭代

---

## 备注

- 所有新功能需要同步更新 `notes.js`、`server.js`、`plugin/notes.js`
- 每个功能完成后需要更新文档（README.md、SKILL.md）
- 建议每个功能单独创建分支，完成后合并到 main
