# WBW Skill 开发计划 v2.0

## 当前状态

### 已完成
- Phase 1: 基础增强（标签、模板、排序、批量操作）✅
- Phase 2: 高级功能（导入/导出、版本历史、统计）✅
- Phase 3: 代码质量（TypeScript骨架、测试、CI/CD、文档）✅

### 待改进
- TypeScript 迁移未完成（实际代码仍是 JS）
- 三个文件大量重复代码（JumpToParser, NotesManager）
- 无单元测试覆盖
- 无实际的 TypeScript 构建产物

---

## Phase 4 - TypeScript 完整迁移 🔥

**目标：** 将 notes.js/server.js/plugin 完全迁移到 TypeScript

**任务：**
1. 将 `notes.js` → `src/cli.ts`
2. 将 `server.js` → `src/mcp/server.ts`
3. 将 `plugin/notes.js` → `src/plugin/index.ts`
4. 提取共享模块 `src/core/notes-manager.ts`, `src/core/jump-parser.ts`
5. 配置构建脚本，删除旧 JS 文件

**状态：** 进行中

---

## Phase 5 - 代码去重与重构 🔥

**目标：** 消除三文件重复代码，删除旧 JS 文件

**已完成：**
- 创建 `src/core/jump-parser.ts` 共享模块
- 创建 `src/core/notes-manager.ts` 共享模块
- 删除旧 JS 文件（notes.js, server.js, plugin/notes.js）

**状态：** 进行中

---

## Phase 6 - 完善测试覆盖 ⭐

**目标：** 补充完整单元测试

**测试文件：**
- `tests/notes-manager.test.ts`
- `tests/jump-parser.test.ts`
- `tests/cli.test.ts`
- `tests/mcp-server.test.ts`
- `tests/plugin.test.ts`

**测试用例：**
- CRUD 操作
- 搜索功能
- 跳转解析
- 错误处理
- 边界条件

**状态：** 待开始

---

## Phase 7 - 功能增强 ⭐

**目标：** 新增实用功能

### 7.1 笔记收藏/置顶
- `--pinned` 标记重要笔记
- 优先显示置顶笔记

### 7.2 笔记链接与引用
- `[[@jumpto level,id]]` 内部链接
- 反向链接查询（哪些笔记引用了当前笔记）

**状态：** 进行中

---

## Phase 8 - 安全增强 💡

**目标：** 提升数据安全性

### 8.1 输入验证
- 验证所有用户输入
- 防止路径遍历攻击

### 8.2 数据清理
- Markdown XSS 防护
- 特殊字符处理

**状态：** 进行中

---

## Phase 9 - 性能优化 💡

**目标：** 提升大数据量性能

### 9.1 索引系统
- 创建笔记索引文件
- 加速搜索和列表

**状态：** 进行中

---

## Phase 10 - 生态集成 💡

**目标：** 更好的工具集成

### 10.1 CLI 增强
- 彩色输出
- 更好的错误提示

**状态：** 进行中

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
