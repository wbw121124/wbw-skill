/**
 * WBW Skill - 通用笔记管理工具插件
 * 
 * 为 opencode 提供笔记管理的自定义工具
 * 支持全局/工作区/代理三个存储级别
 * 
 * 作者：wbw121124
 * 邮箱：wbw121124@163.com
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 跳转语法解析器
 * 支持格式: [@jumpto level,agent,id:lineno:column]
 */
class JumpToParser {
    /**
     * 解析跳转语法
     * @param {string} content - 包含跳转语法的内容
     * @returns {Array} 解析后的跳转链接数组
     */
    static parse(content) {
        const regex = /\[@jumpto\s+([^,\s]+)(?:,([^,\s]*))?,([^:]+)(?::(\d+))?(?::(\d+))?\]/g;
        const jumps = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            jumps.push({
                fullMatch: match[0],
                level: match[1],
                agent: match[2] || null,
                id: match[3],
                lineno: match[4] ? parseInt(match[4]) : null,
                column: match[5] ? parseInt(match[5]) : null
            });
        }

        return jumps;
    }

    /**
     * 将跳转语法转换为可读的链接描述
     * @param {Object} jump - 解析后的跳转对象
     * @returns {string} 可读的链接描述
     */
    static toDescription(jump) {
        let desc = `→ ${jump.level}/${jump.id}`;
        if (jump.agent) desc = `→ ${jump.level}/${jump.agent}/${jump.id}`;
        if (jump.lineno) desc += `:${jump.lineno}`;
        if (jump.column) desc += `:${jump.column}`;
        return desc;
    }

    /**
     * 将跳转语法转换为统一的跳转目标格式
     * @param {Object} jump - 解析后的跳转对象
     * @returns {Object} 跳转目标对象
     */
    static toTarget(jump) {
        return {
            level: jump.level,
            agent: jump.agent,
            id: jump.id,
            lineno: jump.lineno || 1,
            column: jump.column || 1
        };
    }
}

/**
 * 笔记管理器类
 */
class NotesManager {
    constructor() {
        this.globalDir = path.join(os.homedir(), '.wbw-skill', 'notes', 'global');
        this.workspaceDir = path.join(process.cwd(), '.wbw-skill', 'notes', 'workspace');
        this.agentDir = path.join(process.cwd(), '.wbw-skill', 'notes', 'agent');
    }

    getDir(level, agentName = null) {
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

    generateId() {
        return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    parseNote(content) {
        const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);
        
        if (!match) {
            return { frontmatter: {}, content: content };
        }

        const frontmatter = {};
        const lines = match[1].split('\n');
        
        for (const line of lines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                
                frontmatter[key] = value;
            }
        }

        return {
            frontmatter,
            content: match[2].trim()
        };
    }

    createNote(level, title, content, agentName = null) {
        const dir = this.getDir(level, agentName);
        fs.mkdirSync(dir, { recursive: true });
        
        const id = this.generateId();
        const now = new Date().toISOString();
        
        const frontmatter = [
            '---',
            `id: "${id}"`,
            `title: "${title}"`,
            `created: "${now}"`,
            `updated: "${now}"`,
            `level: "${level}"`,
            agentName ? `agent: "${agentName}"` : null,
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
            path: filePath
        };
    }

    listNotes(level, agentName = null) {
        const dir = this.getDir(level, agentName);
        
        if (!fs.existsSync(dir)) {
            return { notes: [], count: 0 };
        }
        
        const files = fs.readdirSync(dir).filter(file => file.endsWith('.md'));
        const notes = [];
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const { frontmatter } = this.parseNote(content);
            
            notes.push({
                id: frontmatter.id || file.replace('.md', ''),
                title: frontmatter.title || 'Untitled',
                created: frontmatter.created,
                updated: frontmatter.updated,
                level: frontmatter.level || level,
                agentName: frontmatter.agent || agentName
            });
        }
        
        notes.sort((a, b) => new Date(b.created) - new Date(a.created));
        
        return { notes, count: notes.length };
    }

    readNote(level, id, agentName = null, parseJumps = true) {
        const dir = this.getDir(level, agentName);
        const filePath = path.join(dir, `${id}.md`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Note not found: ${id}`);
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const { frontmatter, content: noteContent } = this.parseNote(content);
        
        const result = {
            id: frontmatter.id || id,
            title: frontmatter.title || 'Untitled',
            content: noteContent,
            created: frontmatter.created,
            updated: frontmatter.updated,
            level: frontmatter.level || level,
            agentName: frontmatter.agent || agentName,
            path: filePath
        };

        // 解析跳转语法
        if (parseJumps) {
            const jumps = JumpToParser.parse(noteContent);
            if (jumps.length > 0) {
                result.jumps = jumps.map(j => ({
                    original: j.fullMatch,
                    target: JumpToParser.toTarget(j),
                    description: JumpToParser.toDescription(j)
                }));
            }
        }

        return result;
    }

    updateNote(level, id, content, agentName = null) {
        const dir = this.getDir(level, agentName);
        const filePath = path.join(dir, `${id}.md`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Note not found: ${id}`);
        }
        
        const existingContent = fs.readFileSync(filePath, 'utf8');
        const { frontmatter } = this.parseNote(existingContent);
        
        const updatedFrontmatter = [
            '---',
            `id: "${frontmatter.id || id}"`,
            `title: "${frontmatter.title || 'Untitled'}"`,
            `created: "${frontmatter.created}"`,
            `updated: "${new Date().toISOString()}"`,
            `level: "${frontmatter.level || level}"`,
            frontmatter.agent ? `agent: "${frontmatter.agent}"` : null,
            '---'
        ].filter(Boolean).join('\n');
        
        const updatedContent = `${updatedFrontmatter}\n\n${content}`;
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        
        return {
            success: true,
            id: frontmatter.id || id,
            title: frontmatter.title || 'Untitled',
            level: frontmatter.level || level,
            agentName: frontmatter.agent || agentName,
            path: filePath
        };
    }

    deleteNote(level, id, agentName = null) {
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
}

/**
 * opencode 插件入口
 */
export default async ({ client, project, directory, $ }) => {
    const manager = new NotesManager();

    return {
        /**
         * 注册自定义工具
         */
        tool: {
            /**
             * 笔记管理工具
             */
            notes: {
                description: "Manage notes/memos with global, workspace, and agent-level storage. Use for creating, reading, updating, or deleting notes.",
                parameters: {
                    type: "object",
                    properties: {
                        action: {
                            type: "string",
                            enum: ["create", "list", "read", "update", "delete", "jumpto", "parse_jumps"],
                            description: "The action to perform"
                        },
                        level: {
                            type: "string",
                            enum: ["global", "workspace", "agent"],
                            description: "Storage level: global (shared), workspace (project-specific), agent (agent-specific)",
                            default: "workspace"
                        },
                        title: {
                            type: "string",
                            description: "Note title (required for create)"
                        },
                        content: {
                            type: "string",
                            description: "Note content (required for create and update)"
                        },
                        id: {
                            type: "string",
                            description: "Note ID (required for read, update, delete)"
                        },
                        agentName: {
                            type: "string",
                            description: "Agent name (required for agent-level notes)"
                        },
                        lineno: {
                            type: "integer",
                            description: "Target line number (for jumpto action)",
                            minimum: 1
                        },
                        column: {
                            type: "integer",
                            description: "Target column number (for jumpto action)",
                            minimum: 1
                        }
                    },
                    required: ["action"]
                },
                execute: async (args) => {
                    const { action, level, title, content, id, agentName, lineno, column } = args;

                    try {
                        switch (action) {
                            case 'create':
                                if (!title || !content) {
                                    return { error: "Title and content are required for create action" };
                                }
                                return manager.createNote(level || 'workspace', title, content, agentName);

                            case 'list':
                                return manager.listNotes(level || 'workspace', agentName);

                            case 'read':
                                if (!id) {
                                    return { error: "ID is required for read action" };
                                }
                                return manager.readNote(level || 'workspace', id, agentName);

                            case 'update':
                                if (!id || !content) {
                                    return { error: "ID and content are required for update action" };
                                }
                                return manager.updateNote(level || 'workspace', id, content, agentName);

                            case 'delete':
                                if (!id) {
                                    return { error: "ID is required for delete action" };
                                }
                                return manager.deleteNote(level || 'workspace', id, agentName);

                            case 'jumpto':
                                if (!id) {
                                    return { error: "ID is required for jumpto action" };
                                }
                                const jumptoResult = manager.readNote(level || 'workspace', id, agentName, false);
                                jumptoResult.jumpTarget = {
                                    level: level || 'workspace',
                                    id: id,
                                    agent: agentName,
                                    lineno: lineno || 1,
                                    column: column || 1
                                };
                                if (lineno) {
                                    const lines = jumptoResult.content.split('\n');
                                    if (lineno <= lines.length) {
                                        jumptoResult.targetLine = lines[lineno - 1];
                                        jumptoResult.targetLineContent = lines.slice(
                                            Math.max(0, lineno - 3),
                                            Math.min(lines.length, lineno + 2)
                                        ).join('\n');
                                    }
                                }
                                return jumptoResult;

                            case 'parse_jumps':
                                if (!content) {
                                    return { error: "Content is required for parse_jumps action" };
                                }
                                const jumps = JumpToParser.parse(content);
                                return {
                                    jumps: jumps.map(j => ({
                                        original: j.fullMatch,
                                        target: JumpToParser.toTarget(j),
                                        description: JumpToParser.toDescription(j)
                                    })),
                                    count: jumps.length
                                };

                            default:
                                return { error: `Invalid action: ${action}. Use create, list, read, update, delete, jumpto, or parse_jumps.` };
                        }
                    } catch (error) {
                        return { error: error.message };
                    }
                }
            }
        }
    };
};