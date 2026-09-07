/**
 * 笔记管理器类
 * 负责笔记的增删改查操作
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
const archiver = require('archiver');
import { JumpParser } from './jump-parser';
import {
    Note,
    NoteMetadata,
    StorageLevel,
    SearchOptions,
    SearchResult,
    SearchMatch,
    SortOptions,
    NoteTemplate,
    BatchResult,
    StatsResult,
    HistoryVersion,
    HistoryVersionContent,
    ExportResult,
    ImportResult
} from '../types';

export class NotesManager {
    private globalDir: string;
    private workspaceDir: string;
    private agentDir: string;
    private historyDir: string;
    private templates: Record<string, NoteTemplate>;

    constructor() {
        this.globalDir = path.join(os.homedir(), '.wbw-skill', 'notes', 'global');
        this.workspaceDir = path.join(process.cwd(), '.wbw-skill', 'notes', 'workspace');
        this.agentDir = path.join(process.cwd(), '.wbw-skill', 'notes', 'agent');
        this.historyDir = path.join(process.cwd(), '.wbw-skill', 'history');

        this.templates = {
            meeting: {
                name: 'meeting',
                description: '会议记录模板',
                content: `# 会议记录

## 会议信息
- **日期：** ${new Date().toLocaleDateString('zh-CN')}
- **时间：** 
- **地点：** 
- **参与者：** 

## 议题
1. 

## 讨论内容


## 决议事项
- [ ] 

## 下一步行动
- [ ] 

## 备注
`
            },
            todo: {
                name: 'todo',
                description: '待办事项模板',
                content: `# 待办事项

## 紧急且重要
- [ ] 

## 重要但不紧急
- [ ] 

## 紧急但不重要
- [ ] 

## 不紧急不重要
- [ ] 

## 已完成
- [x] 

## 备注
`
            },
            daily: {
                name: 'daily',
                description: '日记/日志模板',
                content: `# ${new Date().toLocaleDateString('zh-CN')} 工作日志

## 今日目标
1. 

## 工作内容
### 上午
- 

### 下午
- 

## 遇到的问题


## 解决方案


## 明日计划
1. 

## 备注
`
            },
            idea: {
                name: 'idea',
                description: '想法/灵感模板',
                content: `# 想法记录

## 标题
**灵感来源：** 

## 核心想法


## 详细描述


## 可行性分析
- **技术可行性：** 
- **资源需求：** 
- **预期收益：** 

## 相关链接
- 

## 下一步
- [ ] 
`
            },
            bug: {
                name: 'bug',
                description: 'Bug 报告模板',
                content: `# Bug 报告

## 基本信息
- **报告日期：** ${new Date().toLocaleDateString('zh-CN')}
- **报告人：** 
- **优先级：** [高/中/低]

## Bug 描述
### 现象


### 预期行为


## 复现步骤
1. 
2. 
3. 

## 环境信息
- **操作系统：** 
- **浏览器/应用版本：** 
- **其他环境：** 

## 截图/日志


## 临时解决方案


## 根本原因分析


## 修复建议


## 状态
- [ ] 待确认
- [ ] 处理中
- [ ] 已修复
- [ ] 已验证
`
            },
            feature: {
                name: 'feature',
                description: '功能需求模板',
                content: `# 功能需求

## 基本信息
- **需求日期：** ${new Date().toLocaleDateString('zh-CN')}
- **提出者：** 
- **优先级：** [高/中/低]

## 需求背景


## 功能描述


## 用户故事
作为 **[角色]**，我想要 **[功能]**，以便 **[价值]**。

## 验收标准
- [ ] 
- [ ] 
- [ ] 

## 技术方案


## 影响范围
- **前端：** 
- **后端：** 
- **数据库：** 

## 工作量评估
- **预估工时：** 
- **负责人：** 

## 状态
- [ ] 待评审
- [ ] 已批准
- [ ] 开发中
- [ ] 已完成
`
            }
        };
    }

    /**
     * 获取所有可用模板列表
     */
    listTemplates(): { templates: NoteTemplate[]; count: number } {
        const templateList = Object.values(this.templates).map(t => ({
            name: t.name,
            description: t.description,
            content: t.content
        }));
        return { templates: templateList, count: templateList.length };
    }

    /**
     * 获取指定模板的内容
     */
    getTemplate(templateName: string): NoteTemplate {
        const template = this.templates[templateName];
        if (!template) {
            throw new Error(`Template not found: ${templateName}. Available: ${Object.keys(this.templates).join(', ')}`);
        }
        return { ...template };
    }

    /**
     * 根据级别获取对应的存储目录
     */
    getDir(level: StorageLevel, agentName?: string): string {
        switch (level) {
            case 'global':
                return this.globalDir;
            case 'workspace':
                return this.workspaceDir;
            case 'agent':
                if (!agentName) {
                    throw new Error('Agent name is required for agent-level notes');
                }
                return path.join(this.agentDir, agentName);
            default:
                throw new Error(`Invalid level: ${level}. Use global, workspace, or agent.`);
        }
    }

    /**
     * 生成唯一的笔记 ID
     */
    generateId(): string {
        return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 解析 Markdown 笔记文件，提取前置元数据和内容
     */
    parseNote(content: string): { frontmatter: Record<string, any>; content: string } {
        const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);
        
        if (!match) {
            return { frontmatter: {}, content: content };
        }

        const frontmatter: Record<string, any> = {};
        const lines = match[1].split('\n');
        
        for (const line of lines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                
                if (value.startsWith('[') && value.endsWith(']')) {
                    const arrayStr = value.slice(1, -1).trim();
                    if (arrayStr === '') {
                        frontmatter[key] = [];
                    } else {
                        frontmatter[key] = arrayStr.split(',').map(item => item.trim());
                    }
                } else {
                    if ((value.startsWith('"') && value.endsWith('"')) || 
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    frontmatter[key] = value;
                }
            }
        }

        return {
            frontmatter,
            content: match[2].trim()
        };
    }

    /**
     * 创建新笔记
     */
    createNote(
        level: StorageLevel,
        title: string,
        content: string,
        agentName?: string,
        tags?: string[],
        template?: string,
        pinned?: boolean
    ): { success: boolean; id: string; title: string; level: StorageLevel; agentName?: string; tags: string[]; pinned: boolean; path: string } {
        if (template) {
            const templateData = this.getTemplate(template);
            content = content ? `${content}\n\n---\n\n${templateData.content}` : templateData.content;
        }

        const dir = this.getDir(level, agentName);
        fs.mkdirSync(dir, { recursive: true });
        
        const id = this.generateId();
        const now = new Date().toISOString();
        
        const tagsStr = tags && tags.length > 0 ? `[${tags.join(', ')}]` : '[]';
        
        const frontmatter = [
            '---',
            `id: "${id}"`,
            `title: "${title}"`,
            `created: "${now}"`,
            `updated: "${now}"`,
            `level: "${level}"`,
            agentName ? `agent: "${agentName}"` : null,
            `tags: ${tagsStr}`,
            `pinned: ${pinned ? 'true' : 'false'}`,
            '---'
        ].filter(Boolean).join('\n');
        
        const noteContent = `${frontmatter}\n\n${content}`;
        const filename = `${id}.md`;
        const filePath = path.join(dir, filename);
        
        fs.writeFileSync(filePath, noteContent, 'utf8');
        
        return {
            success: true,
            id,
            title,
            level,
            agentName,
            tags: tags || [],
            pinned: pinned || false,
            path: filePath
        };
    }

    /**
     * 列出指定级别的所有笔记
     */
    listNotes(
        level: StorageLevel,
        agentName?: string,
        options: SortOptions = {}
    ): { notes: NoteMetadata[]; count: number } {
        const { sort = 'created', order = 'desc' } = options;
        const dir = this.getDir(level, agentName);
        
        if (!fs.existsSync(dir)) {
            return { notes: [], count: 0 };
        }
        
        const files = fs.readdirSync(dir).filter(file => file.endsWith('.md'));
        const notes: NoteMetadata[] = [];
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const { frontmatter } = this.parseNote(content);
            
            notes.push({
                id: frontmatter.id || file.replace('.md', ''),
                title: frontmatter.title || 'Untitled',
                created: frontmatter.created,
                updated: frontmatter.updated,
                level: (frontmatter.level || level) as StorageLevel,
                agentName: frontmatter.agent || agentName,
                tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
                pinned: frontmatter.pinned === 'true' || frontmatter.pinned === true
            });
        }
        
        notes.sort((a, b) => {
            // 置顶笔记优先
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            
            let comparison = 0;
            switch (sort) {
                case 'updated':
                    comparison = new Date(a.updated || a.created).getTime() - new Date(b.updated || b.created).getTime();
                    break;
                case 'title':
                    comparison = (a.title || '').localeCompare(b.title || '');
                    break;
                case 'id':
                    comparison = (a.id || '').localeCompare(b.id || '');
                    break;
                case 'created':
                default:
                    comparison = new Date(a.created).getTime() - new Date(b.created).getTime();
                    break;
            }
            return order === 'desc' ? -comparison : comparison;
        });
        
        return { notes, count: notes.length };
    }

    /**
     * 读取指定笔记的内容
     */
    readNote(
        level: StorageLevel,
        id: string,
        agentName?: string,
        parseJumps: boolean = true
    ): Note {
        const dir = this.getDir(level, agentName);
        const filePath = path.join(dir, `${id}.md`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Note not found: ${id}`);
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const { frontmatter, content: noteContent } = this.parseNote(content);
        
        const result: Note = {
            id: frontmatter.id || id,
            title: frontmatter.title || 'Untitled',
            content: noteContent,
            created: frontmatter.created,
            updated: frontmatter.updated,
            level: (frontmatter.level || level) as StorageLevel,
            agentName: frontmatter.agent || agentName,
            path: filePath,
            tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : []
        };

        if (parseJumps) {
            const jumps = JumpParser.parse(noteContent);
            if (jumps.length > 0) {
                (result as any).jumps = jumps.map(j => ({
                    original: j.fullMatch,
                    target: JumpParser.toTarget(j),
                    description: JumpParser.toDescription(j)
                }));
            }
        }

        return result;
    }

    /**
     * 更新指定笔记的内容
     */
    updateNote(
        level: StorageLevel,
        id: string,
        content: string,
        agentName?: string,
        tags?: string[]
    ): { success: boolean; id: string; title: string; level: StorageLevel; agentName?: string; tags: string[]; path: string } {
        const dir = this.getDir(level, agentName);
        const filePath = path.join(dir, `${id}.md`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Note not found: ${id}`);
        }
        
        const existingContent = fs.readFileSync(filePath, 'utf8');
        const { frontmatter } = this.parseNote(existingContent);
        
        const updatedTags = tags !== undefined ? tags : (Array.isArray(frontmatter.tags) ? frontmatter.tags : []);
        const tagsStr = updatedTags.length > 0 ? `[${updatedTags.join(', ')}]` : '[]';
        
        const updatedFrontmatter = [
            '---',
            `id: "${frontmatter.id || id}"`,
            `title: "${frontmatter.title || 'Untitled'}"`,
            `created: "${frontmatter.created}"`,
            `updated: "${new Date().toISOString()}"`,
            `level: "${frontmatter.level || level}"`,
            frontmatter.agent ? `agent: "${frontmatter.agent}"` : null,
            `tags: ${tagsStr}`,
            '---'
        ].filter(Boolean).join('\n');
        
        const updatedContent = `${updatedFrontmatter}\n\n${content}`;
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        
        return {
            success: true,
            id: frontmatter.id || id,
            title: frontmatter.title || 'Untitled',
            level: (frontmatter.level || level) as StorageLevel,
            agentName: frontmatter.agent || agentName,
            tags: updatedTags,
            path: filePath
        };
    }

    /**
     * 删除指定笔记
     */
    deleteNote(level: StorageLevel, id: string, agentName?: string): { success: boolean; id: string; level: StorageLevel; agentName?: string; deleted: boolean } {
        const dir = this.getDir(level, agentName);
        const filePath = path.join(dir, `${id}.md`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Note not found: ${id}`);
        }
        
        fs.unlinkSync(filePath);
        
        return {
            success: true,
            id,
            level,
            agentName,
            deleted: true
        };
    }

    /**
     * 切换笔记置顶状态
     */
    togglePin(level: StorageLevel, id: string, agentName?: string): { success: boolean; id: string; pinned: boolean } {
        const dir = this.getDir(level, agentName);
        const filePath = path.join(dir, `${id}.md`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Note not found: ${id}`);
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const { frontmatter, content: noteContent } = this.parseNote(content);
        
        const currentPinned = frontmatter.pinned === 'true' || frontmatter.pinned === true;
        const newPinned = !currentPinned;
        
        // 更新 frontmatter
        const updatedFrontmatter = [
            '---',
            `id: "${frontmatter.id || id}"`,
            `title: "${frontmatter.title || 'Untitled'}"`,
            `created: "${frontmatter.created}"`,
            `updated: "${new Date().toISOString()}"`,
            `level: "${frontmatter.level || level}"`,
            frontmatter.agent ? `agent: "${frontmatter.agent}"` : null,
            `tags: ${Array.isArray(frontmatter.tags) ? `[${frontmatter.tags.join(', ')}]` : '[]'}`,
            `pinned: ${newPinned ? 'true' : 'false'}`,
            '---'
        ].filter(Boolean).join('\n');
        
        const updatedContent = `${updatedFrontmatter}\n\n${noteContent}`;
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        
        return {
            success: true,
            id,
            pinned: newPinned
        };
    }

    /**
     * 按标签列出笔记
     */
    listNotesByTag(tag: string, level?: StorageLevel, agentName?: string): NoteMetadata[] {
        const results: NoteMetadata[] = [];
        const levels = level ? [level] : (['global', 'workspace', 'agent'] as StorageLevel[]);

        for (const lvl of levels) {
            let dirs: Array<{ dir: string; level: StorageLevel; agent: string | null }> = [];
            
            if (lvl === 'agent' && agentName) {
                const agentDir = path.join(this.agentDir, agentName);
                if (fs.existsSync(agentDir)) {
                    dirs.push({ dir: agentDir, level: 'agent', agent: agentName });
                }
            } else if (lvl === 'agent' && !agentName) {
                if (fs.existsSync(this.agentDir)) {
                    const agents = fs.readdirSync(this.agentDir).filter(f => {
                        const fullPath = path.join(this.agentDir, f);
                        return fs.statSync(fullPath).isDirectory();
                    });
                    for (const agent of agents) {
                        dirs.push({ 
                            dir: path.join(this.agentDir, agent), 
                            level: 'agent', 
                            agent: agent 
                        });
                    }
                }
            } else if (lvl === 'global') {
                dirs.push({ dir: this.globalDir, level: 'global', agent: null });
            } else if (lvl === 'workspace') {
                dirs.push({ dir: this.workspaceDir, level: 'workspace', agent: null });
            }

            for (const { dir, level: resultLevel, agent } of dirs) {
                if (!fs.existsSync(dir)) continue;

                const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
                
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const { frontmatter } = this.parseNote(content);
                    
                    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
                    
                    if (tags.some(t => t.toLowerCase() === tag.toLowerCase())) {
                        results.push({
                            id: frontmatter.id || file.replace('.md', ''),
                            title: frontmatter.title || 'Untitled',
                            created: frontmatter.created,
                            updated: frontmatter.updated,
                            level: resultLevel,
                            agentName: agent || undefined,
                            tags: tags
                        });
                    }
                }
            }
        }

        results.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

        return results;
    }

    /**
     * 批量删除笔记
     */
    batchDelete(ids: string[], level: StorageLevel, agentName?: string): BatchResult {
        const results: Array<{ id: string; success: boolean }> = [];
        const errors: Array<{ id: string; error: string }> = [];

        for (const id of ids) {
            try {
                this.deleteNote(level, id, agentName);
                results.push({ id, success: true });
            } catch (error) {
                errors.push({ id, error: (error as Error).message });
            }
        }

        return {
            success: errors.length === 0,
            deleted: results.length,
            failed: errors.length,
            results,
            errors
        };
    }

    /**
     * 批量移动笔记到其他级别
     */
    batchMove(
        ids: string[],
        fromLevel: StorageLevel,
        toLevel: StorageLevel,
        fromAgentName?: string,
        toAgentName?: string
    ): BatchResult {
        const results: Array<{ id: string; newId: string; success: boolean }> = [];
        const errors: Array<{ id: string; error: string }> = [];

        for (const id of ids) {
            try {
                const note = this.readNote(fromLevel, id, fromAgentName, false);
                
                const createResult = this.createNote(
                    toLevel,
                    note.title,
                    note.content,
                    toAgentName,
                    note.tags
                );
                
                this.deleteNote(fromLevel, id, fromAgentName);
                
                results.push({ 
                    id, 
                    newId: createResult.id,
                    success: true 
                });
            } catch (error) {
                errors.push({ id, error: (error as Error).message });
            }
        }

        return {
            success: errors.length === 0,
            moved: results.length,
            failed: errors.length,
            results,
            errors
        };
    }

    /**
     * 批量添加标签到笔记
     */
    batchAddTags(ids: string[], addTags: string[], level: StorageLevel, agentName?: string): BatchResult {
        const results: Array<{ id: string; tags: string[]; success: boolean }> = [];
        const errors: Array<{ id: string; error: string }> = [];

        for (const id of ids) {
            try {
                const note = this.readNote(level, id, agentName, false);
                
                const existingTags = note.tags || [];
                const newTags = [...new Set([...existingTags, ...addTags])];
                
                this.updateNote(level, id, note.content, agentName, newTags);
                
                results.push({ 
                    id, 
                    tags: newTags,
                    success: true 
                });
            } catch (error) {
                errors.push({ id, error: (error as Error).message });
            }
        }

        return {
            success: errors.length === 0,
            updated: results.length,
            failed: errors.length,
            results,
            errors
        };
    }

    /**
     * 批量删除标签
     */
    batchRemoveTags(ids: string[], removeTags: string[], level: StorageLevel, agentName?: string): BatchResult {
        const results: Array<{ id: string; tags: string[]; success: boolean }> = [];
        const errors: Array<{ id: string; error: string }> = [];

        for (const id of ids) {
            try {
                const note = this.readNote(level, id, agentName, false);
                
                const existingTags = note.tags || [];
                const newTags = existingTags.filter(t => !removeTags.includes(t));
                
                this.updateNote(level, id, note.content, agentName, newTags);
                
                results.push({ 
                    id, 
                    tags: newTags,
                    success: true 
                });
            } catch (error) {
                errors.push({ id, error: (error as Error).message });
            }
        }

        return {
            success: errors.length === 0,
            updated: results.length,
            failed: errors.length,
            results,
            errors
        };
    }

    /**
     * 导出单个笔记为 Markdown 文件
     */
    exportNote(level: StorageLevel, id: string, outputPath: string, agentName?: string): ExportResult {
        const note = this.readNote(level, id, agentName, false);
        const dir = this.getDir(level, agentName);
        const sourcePath = path.join(dir, `${id}.md`);
        
        fs.mkdirSync(outputPath, { recursive: true });
        
        const fileName = `${note.title.replace(/[<>:"/\\|?*]/g, '_')}.md`;
        const destPath = path.join(outputPath, fileName);
        
        fs.copyFileSync(sourcePath, destPath);
        
        return {
            success: true,
            id,
            title: note.title,
            source: sourcePath,
            destination: destPath
        };
    }

    /**
     * 导出笔记为 JSON 格式
     */
    exportNoteAsJson(level: StorageLevel, id: string, outputPath: string, agentName?: string): ExportResult {
        const note = this.readNote(level, id, agentName, false);
        
        fs.mkdirSync(outputPath, { recursive: true });
        
        const fileName = `${note.title.replace(/[<>:"/\\|?*]/g, '_')}.json`;
        const destPath = path.join(outputPath, fileName);
        
        const jsonData = {
            id: note.id,
            title: note.title,
            content: note.content,
            created: note.created,
            updated: note.updated,
            level: note.level,
            agentName: note.agentName,
            tags: note.tags,
            exportedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(destPath, JSON.stringify(jsonData, null, 2), 'utf8');
        
        return {
            success: true,
            id,
            title: note.title,
            destination: destPath
        };
    }

    /**
     * 批量导出笔记为 ZIP 压缩包
     */
    async exportNotesAsZip(level: StorageLevel, outputPath: string, agentName?: string): Promise<ExportResult> {
        const dir = this.getDir(level, agentName);
        
        if (!fs.existsSync(dir)) {
            throw new Error(`No notes found for level: ${level}`);
        }
        
        const files = fs.readdirSync(dir).filter(file => file.endsWith('.md'));
        
        if (files.length === 0) {
            throw new Error(`No notes found for level: ${level}`);
        }
        
        const outputDir = path.dirname(outputPath);
        fs.mkdirSync(outputDir, { recursive: true });
        
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            output.on('close', () => {
                resolve({
                    success: true,
                    level,
                    count: files.length,
                    destination: outputPath,
                    size: archive.pointer()
                });
            });
            
            archive.on('error', reject);
            
            archive.pipe(output);
            
            for (const file of files) {
                const filePath = path.join(dir, file);
                archive.file(filePath, { name: file });
            }
            
            archive.finalize();
        });
    }

    /**
     * 导入笔记从 Markdown 文件
     */
    importNoteFromMarkdown(filePath: string, level: StorageLevel, agentName?: string): ImportResult {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const { frontmatter, content: noteContent } = this.parseNote(content);
        
        const title = frontmatter.title || path.basename(filePath, '.md');
        const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
        
        const result = this.createNote(level, title, noteContent, agentName, tags);
        
        return {
            success: true,
            id: result.id,
            title: result.title,
            source: filePath
        };
    }

    /**
     * 导入笔记从 JSON 文件
     */
    importNoteFromJson(filePath: string, level: StorageLevel, agentName?: string): ImportResult {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(content);
        
        const title = jsonData.title || path.basename(filePath, '.json');
        const tags = Array.isArray(jsonData.tags) ? jsonData.tags : [];
        
        const result = this.createNote(level, title, jsonData.content, agentName, tags);
        
        return {
            success: true,
            id: result.id,
            title: result.title,
            source: filePath
        };
    }

    /**
     * 批量导入笔记从 ZIP 压缩包
     */
    async importNotesFromZip(zipPath: string, level: StorageLevel, agentName?: string): Promise<BatchResult> {
        const AdmZip = require('adm-zip');
        
        if (!fs.existsSync(zipPath)) {
            throw new Error(`ZIP file not found: ${zipPath}`);
        }
        
        const zip = new AdmZip(zipPath);
        const entries = zip.getEntries();
        
        const results: Array<{ id: string; success: boolean }> = [];
        const errors: Array<{ id: string; error: string }> = [];
        
        for (const entry of entries) {
            if (entry.entryName.endsWith('.md')) {
                try {
                    const content = entry.getData().toString('utf8');
                    const { frontmatter, content: noteContent } = this.parseNote(content);
                    
                    const title = frontmatter.title || entry.entryName.replace('.md', '');
                    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
                    
                    const result = this.createNote(level, title, noteContent, agentName, tags);
                    results.push({ id: result.id, success: true });
                } catch (error) {
                    errors.push({ id: entry.entryName, error: (error as Error).message });
                }
            }
        }
        
        return {
            success: errors.length === 0,
            imported: results.length,
            failed: errors.length,
            results,
            errors
        };
    }

    /**
     * 保存笔记历史版本
     */
    saveHistory(level: StorageLevel, id: string, content: string, agentName?: string): { success: boolean; id: string; version: number; path: string } {
        const levelDir = agentName ? `${level}/${agentName}` : level;
        const historyLevelDir = path.join(this.historyDir, levelDir);
        fs.mkdirSync(historyLevelDir, { recursive: true });
        
        const note = this.readNote(level, id, agentName, false);
        
        const version = Date.now();
        const versionFile = `${id}_v${version}.md`;
        const versionPath = path.join(historyLevelDir, versionFile);
        
        const frontmatter = [
            '---',
            `id: "${id}"`,
            `title: "${note.title}"`,
            `version: "${version}"`,
            `savedAt: "${new Date().toISOString()}"`,
            `level: "${level}"`,
            agentName ? `agent: "${agentName}"` : null,
            '---'
        ].filter(Boolean).join('\n');
        
        const versionContent = `${frontmatter}\n\n${content}`;
        fs.writeFileSync(versionPath, versionContent, 'utf8');
        
        this.cleanupHistory(historyLevelDir, id, 10);
        
        return {
            success: true,
            id,
            version,
            path: versionPath
        };
    }

    /**
     * 清理旧的历史版本
     */
    cleanupHistory(historyDir: string, noteId: string, keepCount: number = 10): void {
        if (!fs.existsSync(historyDir)) {
            return;
        }
        
        const files = fs.readdirSync(historyDir)
            .filter(f => f.startsWith(`${noteId}_v`) && f.endsWith('.md'))
            .sort()
            .reverse();
        
        if (files.length > keepCount) {
            for (let i = keepCount; i < files.length; i++) {
                fs.unlinkSync(path.join(historyDir, files[i]));
            }
        }
    }

    /**
     * 查看笔记历史版本列表
     */
    listHistory(level: StorageLevel, id: string, agentName?: string): { versions: HistoryVersion[]; count: number } {
        const levelDir = agentName ? `${level}/${agentName}` : level;
        const historyLevelDir = path.join(this.historyDir, levelDir);
        
        if (!fs.existsSync(historyLevelDir)) {
            return { versions: [], count: 0 };
        }
        
        const files = fs.readdirSync(historyLevelDir)
            .filter(f => f.startsWith(`${id}_v`) && f.endsWith('.md'))
            .sort()
            .reverse();
        
        const versions: HistoryVersion[] = [];
        for (const file of files) {
            const filePath = path.join(historyLevelDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const { frontmatter } = this.parseNote(content);
            
            versions.push({
                version: parseInt(frontmatter.version || file.replace(`${id}_v`, '').replace('.md', '')),
                savedAt: frontmatter.savedAt,
                path: filePath
            });
        }
        
        return { versions, count: versions.length };
    }

    /**
     * 查看特定历史版本内容
     */
    readHistory(level: StorageLevel, id: string, version: number, agentName?: string): HistoryVersionContent {
        const levelDir = agentName ? `${level}/${agentName}` : level;
        const historyLevelDir = path.join(this.historyDir, levelDir);
        const versionFile = `${id}_v${version}.md`;
        const versionPath = path.join(historyLevelDir, versionFile);
        
        if (!fs.existsSync(versionPath)) {
            throw new Error(`Version not found: ${id} v${version}`);
        }
        
        const content = fs.readFileSync(versionPath, 'utf8');
        const { frontmatter, content: noteContent } = this.parseNote(content);
        
        return {
            id: frontmatter.id || id,
            title: frontmatter.title,
            version: parseInt(frontmatter.version || version),
            savedAt: frontmatter.savedAt,
            content: noteContent,
            path: versionPath
        };
    }

    /**
     * 回滚到指定历史版本
     */
    rollbackHistory(level: StorageLevel, id: string, version: number, agentName?: string): { success: boolean; id: string; rolledBackTo: number } {
        const historyVersion = this.readHistory(level, id, version, agentName);
        
        const currentNote = this.readNote(level, id, agentName, false);
        this.saveHistory(level, id, currentNote.content, agentName);
        
        this.updateNote(level, id, historyVersion.content, agentName);
        
        return {
            success: true,
            id,
            rolledBackTo: version
        };
    }

    /**
     * 获取笔记统计信息
     */
    getStats(level?: StorageLevel, agentName?: string, includeTags: boolean = false): StatsResult {
        const stats: StatsResult = {
            totalNotes: 0,
            totalWords: 0,
            totalCharacters: 0,
            byLevel: {},
            recentCreated: [],
            recentUpdated: [],
            storageSize: 0
        };

        const levels = level ? [level] : (['global', 'workspace', 'agent'] as StorageLevel[]);

        for (const lvl of levels) {
            let dirs: Array<{ dir: string; level: StorageLevel; agent: string | null }> = [];
            
            if (lvl === 'agent' && agentName) {
                const agentDir = path.join(this.agentDir, agentName);
                if (fs.existsSync(agentDir)) {
                    dirs.push({ dir: agentDir, level: 'agent', agent: agentName });
                }
            } else if (lvl === 'agent' && !agentName) {
                if (fs.existsSync(this.agentDir)) {
                    const agents = fs.readdirSync(this.agentDir).filter(f => {
                        const fullPath = path.join(this.agentDir, f);
                        return fs.statSync(fullPath).isDirectory();
                    });
                    for (const agent of agents) {
                        dirs.push({ 
                            dir: path.join(this.agentDir, agent), 
                            level: 'agent', 
                            agent: agent 
                        });
                    }
                }
            } else if (lvl === 'global') {
                dirs.push({ dir: this.globalDir, level: 'global', agent: null });
            } else if (lvl === 'workspace') {
                dirs.push({ dir: this.workspaceDir, level: 'workspace', agent: null });
            }

            for (const { dir, level: resultLevel, agent } of dirs) {
                if (!fs.existsSync(dir)) continue;

                const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
                
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const { frontmatter, content: noteContent } = this.parseNote(content);
                    
                    stats.totalCharacters += noteContent.length;
                    
                    const words = noteContent.split(/\s+/).filter(w => w.length > 0);
                    stats.totalWords += words.length;
                    
                    stats.totalNotes++;
                    
                    if (!stats.byLevel[resultLevel]) {
                        stats.byLevel[resultLevel] = 0;
                    }
                    stats.byLevel[resultLevel]++;
                    
                    if (frontmatter.created) {
                        stats.recentCreated.push({
                            id: frontmatter.id || file.replace('.md', ''),
                            title: frontmatter.title || 'Untitled',
                            created: frontmatter.created,
                            updated: frontmatter.updated || frontmatter.created,
                            level: resultLevel,
                            agentName: agent || undefined,
                            tags: []
                        });
                    }
                    
                    if (frontmatter.updated) {
                        stats.recentUpdated.push({
                            id: frontmatter.id || file.replace('.md', ''),
                            title: frontmatter.title || 'Untitled',
                            created: frontmatter.created || frontmatter.updated,
                            updated: frontmatter.updated,
                            level: resultLevel,
                            agentName: agent || undefined,
                            tags: []
                        });
                    }
                    
                    const fileStats = fs.statSync(filePath);
                    stats.storageSize += fileStats.size;
                }
            }
        }

        stats.recentCreated.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        stats.recentUpdated.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
        
        stats.recentCreated = stats.recentCreated.slice(0, 10);
        stats.recentUpdated = stats.recentUpdated.slice(0, 10);

        if (includeTags) {
            stats.tags = this.listTags(level, agentName);
        }

        return stats;
    }

    /**
     * 获取所有标签列表
     */
    listTags(level?: StorageLevel, agentName?: string): Record<string, number> {
        const tagCount: Record<string, number> = {};
        const levels = level ? [level] : (['global', 'workspace', 'agent'] as StorageLevel[]);

        for (const lvl of levels) {
            let dirs: Array<{ dir: string; level: StorageLevel; agent: string | null }> = [];
            
            if (lvl === 'agent' && agentName) {
                const agentDir = path.join(this.agentDir, agentName);
                if (fs.existsSync(agentDir)) {
                    dirs.push({ dir: agentDir, level: 'agent', agent: agentName });
                }
            } else if (lvl === 'agent' && !agentName) {
                if (fs.existsSync(this.agentDir)) {
                    const agents = fs.readdirSync(this.agentDir).filter(f => {
                        const fullPath = path.join(this.agentDir, f);
                        return fs.statSync(fullPath).isDirectory();
                    });
                    for (const agent of agents) {
                        dirs.push({ 
                            dir: path.join(this.agentDir, agent), 
                            level: 'agent', 
                            agent: agent 
                        });
                    }
                }
            } else if (lvl === 'global') {
                dirs.push({ dir: this.globalDir, level: 'global', agent: null });
            } else if (lvl === 'workspace') {
                dirs.push({ dir: this.workspaceDir, level: 'workspace', agent: null });
            }

            for (const { dir } of dirs) {
                if (!fs.existsSync(dir)) continue;

                const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
                
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const { frontmatter } = this.parseNote(content);
                    
                    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
                    
                    for (const tag of tags) {
                        const normalizedTag = tag.toLowerCase();
                        tagCount[normalizedTag] = (tagCount[normalizedTag] || 0) + 1;
                    }
                }
            }
        }

        return tagCount;
    }

    /**
     * 搜索笔记
     */
    searchNotes(
        query: string,
        level?: StorageLevel | null,
        agentName?: string,
        options: SearchOptions = {}
    ): SearchResult[] {
        const { 
            caseSensitive = false, 
            wholeWord = false, 
            regex = false,
            searchIn = 'all' 
        } = options;

        const results: SearchResult[] = [];
        const levels = level ? [level] : (['global', 'workspace', 'agent'] as StorageLevel[]);

        for (const lvl of levels) {
            let dirs: Array<{ dir: string; level: StorageLevel; agent: string | null }> = [];
            
            if (lvl === 'agent' && agentName) {
                const agentDir = path.join(this.agentDir, agentName);
                if (fs.existsSync(agentDir)) {
                    dirs.push({ dir: agentDir, level: 'agent', agent: agentName });
                }
            } else if (lvl === 'agent' && !agentName) {
                if (fs.existsSync(this.agentDir)) {
                    const agents = fs.readdirSync(this.agentDir).filter(f => {
                        const fullPath = path.join(this.agentDir, f);
                        return fs.statSync(fullPath).isDirectory();
                    });
                    for (const agent of agents) {
                        dirs.push({ 
                            dir: path.join(this.agentDir, agent), 
                            level: 'agent', 
                            agent: agent 
                        });
                    }
                }
            } else if (lvl === 'global') {
                dirs.push({ dir: this.globalDir, level: 'global', agent: null });
            } else if (lvl === 'workspace') {
                dirs.push({ dir: this.workspaceDir, level: 'workspace', agent: null });
            }

            for (const { dir, level: resultLevel, agent } of dirs) {
                if (!fs.existsSync(dir)) continue;

                const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
                
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const { frontmatter, content: noteContent } = this.parseNote(content);

                    let searchTargets: Array<{ type: 'title' | 'content'; text: string }> = [];
                    if (searchIn === 'all' || searchIn === 'title') {
                        searchTargets.push({ type: 'title', text: frontmatter.title || '' });
                    }
                    if (searchIn === 'all' || searchIn === 'content') {
                        searchTargets.push({ type: 'content', text: noteContent });
                    }

                    const matches: SearchMatch[] = [];
                    for (const target of searchTargets) {
                        const searchMatches = this.findMatches(
                            target.text, 
                            query, 
                            { caseSensitive, wholeWord, regex }
                        );
                        for (const match of searchMatches) {
                            matches.push({
                                type: target.type,
                                line: match.line,
                                column: match.column,
                                text: match.text,
                                context: match.context
                            });
                        }
                    }

                    if (matches.length > 0) {
                        results.push({
                            id: frontmatter.id || file.replace('.md', ''),
                            title: frontmatter.title || 'Untitled',
                            level: resultLevel,
                            agentName: agent || undefined,
                            path: filePath,
                            matches: matches,
                            matchCount: matches.length
                        });
                    }
                }
            }
        }

        return results;
    }

    /**
     * 在文本中查找匹配项
     */
    findMatches(
        text: string,
        query: string,
        options: { caseSensitive?: boolean; wholeWord?: boolean; regex?: boolean } = {}
    ): Array<{ line: number; column: number; text: string; context: string }> {
        const { caseSensitive = false, wholeWord = false, regex = false } = options;
        const matches: Array<{ line: number; column: number; text: string; context: string }> = [];

        let pattern: RegExp;
        if (regex) {
            try {
                pattern = new RegExp(query, caseSensitive ? 'g' : 'gi');
            } catch (e) {
                throw new Error(`Invalid regex pattern: ${query}`);
            }
        } else {
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const wordBoundary = wholeWord ? '\\b' : '';
            pattern = new RegExp(`${wordBoundary}${escapedQuery}${wordBoundary}`, caseSensitive ? 'g' : 'gi');
        }

        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match: RegExpExecArray | null;
            pattern.lastIndex = 0;

            while ((match = pattern.exec(line)) !== null) {
                const start = Math.max(0, match.index - 30);
                const end = Math.min(line.length, match.index + match[0].length + 30);
                const context = (start > 0 ? '...' : '') + 
                               line.substring(start, end) + 
                               (end < line.length ? '...' : '');

                matches.push({
                    line: i + 1,
                    column: match.index + 1,
                    text: match[0],
                    context: context
                });

                if (match[0].length === 0) {
                    pattern.lastIndex++;
                }
            }
        }

        return matches;
    }
}
