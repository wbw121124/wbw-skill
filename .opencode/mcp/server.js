#!/usr/bin/env node

/**
 * WBW Skill - MCP 服务器
 * 
 * 提供笔记管理功能的 MCP (Model Context Protocol) 服务器
 * 可在 opencode/cloud/openclaw 中使用
 * 
 * 作者：wbw121124
 * 邮箱：wbw121124@163.com
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

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
                
                // 解析数组格式 [item1, item2, ...]
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

    createNote(level, title, content, agentName = null, tags = null) {
        const dir = this.getDir(level, agentName);
        fs.mkdirSync(dir, { recursive: true });
        
        const id = this.generateId();
        const now = new Date().toISOString();
        
        // 处理标签
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
            '---'
        ].filter(Boolean).join('\n');
        
        const noteContent = `${frontmatter}\n\n${content}`;
        const filename = `${id}.md`;
        const filePath = path.join(dir, filename);
        
        fs.writeFileSync(filePath, noteContent, 'utf8');
        
        return {
            id,
            title,
            level,
            agentName,
            tags: tags || [],
            created: now,
            updated: now,
            path: filePath
        };
    }

    listNotes(level, agentName = null) {
        const dir = this.getDir(level, agentName);
        
        if (!fs.existsSync(dir)) {
            return [];
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
                agentName: frontmatter.agent || agentName,
                tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : []
            });
        }
        
        notes.sort((a, b) => new Date(b.created) - new Date(a.created));
        
        return notes;
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
            tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
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

    updateNote(level, id, content, agentName = null, tags = null) {
        const dir = this.getDir(level, agentName);
        const filePath = path.join(dir, `${id}.md`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Note not found: ${id}`);
        }
        
        const existingContent = fs.readFileSync(filePath, 'utf8');
        const { frontmatter } = this.parseNote(existingContent);
        
        // 使用新标签或保留原有标签
        const updatedTags = tags !== null ? tags : (Array.isArray(frontmatter.tags) ? frontmatter.tags : []);
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
            id: frontmatter.id || id,
            title: frontmatter.title || 'Untitled',
            level: frontmatter.level || level,
            agentName: frontmatter.agent || agentName,
            tags: updatedTags,
            updated: new Date().toISOString()
        };
    }

    deleteNote(level, id, agentName = null) {
        const dir = this.getDir(level, agentName);
        const filePath = path.join(dir, `${id}.md`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Note not found: ${id}`);
        }
        
        fs.unlinkSync(filePath);
        
        return { deleted: true };
    }

    /**
     * 按标签列出笔记
     */
    listNotesByTag(tag, level = null, agentName = null) {
        const results = [];
        const levels = level ? [level] : ['global', 'workspace', 'agent'];

        for (const lvl of levels) {
            let dirs = [];
            
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
                            agentName: agent,
                            tags: tags
                        });
                    }
                }
            }
        }

        results.sort((a, b) => new Date(b.created) - new Date(a.created));
        return results;
    }

    /**
     * 获取所有标签列表
     */
    listTags(level = null, agentName = null) {
        const tagCount = {};
        const levels = level ? [level] : ['global', 'workspace', 'agent'];

        for (const lvl of levels) {
            let dirs = [];
            
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
    searchNotes(query, level = null, agentName = null, options = {}) {
        const { 
            caseSensitive = false, 
            wholeWord = false, 
            regex = false,
            searchIn = 'all' 
        } = options;

        const results = [];
        const levels = level ? [level] : ['global', 'workspace', 'agent'];

        for (const lvl of levels) {
            let dirs = [];
            
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

                    let searchTargets = [];
                    if (searchIn === 'all' || searchIn === 'title') {
                        searchTargets.push({ type: 'title', text: frontmatter.title || '' });
                    }
                    if (searchIn === 'all' || searchIn === 'content') {
                        searchTargets.push({ type: 'content', text: noteContent });
                    }

                    const matches = [];
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
                            agentName: agent,
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
    findMatches(text, query, options = {}) {
        const { caseSensitive = false, wholeWord = false, regex = false } = options;
        const matches = [];

        let pattern;
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
            let match;
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

/**
 * MCP 服务器类
 */
class MCPServer {
    constructor() {
        this.manager = new NotesManager();
        this.tools = this.defineTools();
    }

    /**
     * 定义 MCP 工具
     */
    defineTools() {
        return [
            {
                name: "create_note",
                description: "Create a new note/memo",
                inputSchema: {
                    type: "object",
                    properties: {
                        level: {
                            type: "string",
                            enum: ["global", "workspace", "agent"],
                            description: "Storage level: global (shared across projects), workspace (current project), agent (agent-specific)"
                        },
                        title: {
                            type: "string",
                            description: "Note title"
                        },
                        content: {
                            type: "string",
                            description: "Note content (supports Markdown)"
                        },
                        tags: {
                            type: "array",
                            items: { type: "string" },
                            description: "Tags for the note"
                        },
                        agentName: {
                            type: "string",
                            description: "Agent name (required when level is 'agent')"
                        }
                    },
                    required: ["level", "title", "content"]
                }
            },
            {
                name: "list_notes",
                description: "List all notes at a specific level",
                inputSchema: {
                    type: "object",
                    properties: {
                        level: {
                            type: "string",
                            enum: ["global", "workspace", "agent"],
                            description: "Storage level to list notes from"
                        },
                        agentName: {
                            type: "string",
                            description: "Agent name (required when level is 'agent')"
                        }
                    },
                    required: ["level"]
                }
            },
            {
                name: "read_note",
                description: "Read a specific note by ID",
                inputSchema: {
                    type: "object",
                    properties: {
                        level: {
                            type: "string",
                            enum: ["global", "workspace", "agent"],
                            description: "Storage level where the note is stored"
                        },
                        id: {
                            type: "string",
                            description: "Note ID to read"
                        },
                        agentName: {
                            type: "string",
                            description: "Agent name (required when level is 'agent')"
                        }
                    },
                    required: ["level", "id"]
                }
            },
            {
                name: "update_note",
                description: "Update an existing note's content",
                inputSchema: {
                    type: "object",
                    properties: {
                        level: {
                            type: "string",
                            enum: ["global", "workspace", "agent"],
                            description: "Storage level where the note is stored"
                        },
                        id: {
                            type: "string",
                            description: "Note ID to update"
                        },
                        content: {
                            type: "string",
                            description: "New content for the note"
                        },
                        tags: {
                            type: "array",
                            items: { type: "string" },
                            description: "New tags (replaces existing tags)"
                        },
                        agentName: {
                            type: "string",
                            description: "Agent name (required when level is 'agent')"
                        }
                    },
                    required: ["level", "id", "content"]
                }
            },
            {
                name: "delete_note",
                description: "Delete a note by ID",
                inputSchema: {
                    type: "object",
                    properties: {
                        level: {
                            type: "string",
                            enum: ["global", "workspace", "agent"],
                            description: "Storage level where the note is stored"
                        },
                        id: {
                            type: "string",
                            description: "Note ID to delete"
                        },
                        agentName: {
                            type: "string",
                            description: "Agent name (required when level is 'agent')"
                        }
                    },
                    required: ["level", "id"]
                }
            },
            {
                name: "jumpto",
                description: "Jump to a specific location in a note using [@jumpto level,agent,id:lineno:column] syntax",
                inputSchema: {
                    type: "object",
                    properties: {
                        level: {
                            type: "string",
                            enum: ["global", "workspace", "agent"],
                            description: "Target storage level"
                        },
                        id: {
                            type: "string",
                            description: "Target note ID"
                        },
                        lineno: {
                            type: "integer",
                            description: "Target line number (default: 1)",
                            minimum: 1
                        },
                        column: {
                            type: "integer",
                            description: "Target column number (default: 1)",
                            minimum: 1
                        },
                        agentName: {
                            type: "string",
                            description: "Agent name (required when level is 'agent')"
                        }
                    },
                    required: ["level", "id"]
                }
            },
            {
                name: "parse_jumps",
                description: "Parse [@jumpto] syntax in content and return all jump targets",
                inputSchema: {
                    type: "object",
                    properties: {
                        content: {
                            type: "string",
                            description: "Content containing [@jumpto] syntax"
                        }
                    },
                    required: ["content"]
                }
            },
            {
                name: "search_notes",
                description: "Search notes by keyword in title or content",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search keyword or pattern"
                        },
                        level: {
                            type: "string",
                            enum: ["global", "workspace", "agent"],
                            description: "Storage level to search (optional, searches all levels if not specified)"
                        },
                        agentName: {
                            type: "string",
                            description: "Agent name (optional, for agent-level search)"
                        },
                        caseSensitive: {
                            type: "boolean",
                            description: "Case-sensitive search (default: false)",
                            default: false
                        },
                        wholeWord: {
                            type: "boolean",
                            description: "Whole word match (default: false)",
                            default: false
                        },
                        regex: {
                            type: "boolean",
                            description: "Use regex pattern (default: false)",
                            default: false
                        },
                        searchIn: {
                            type: "string",
                            enum: ["all", "title", "content"],
                            description: "Search scope: all, title, content (default: all)",
                            default: "all"
                        }
                    },
                    required: ["query"]
                }
            },
            {
                name: "list_notes_by_tag",
                description: "List all notes with a specific tag",
                inputSchema: {
                    type: "object",
                    properties: {
                        tag: {
                            type: "string",
                            description: "Tag to filter by"
                        },
                        level: {
                            type: "string",
                            enum: ["global", "workspace", "agent"],
                            description: "Storage level (optional, searches all levels if not specified)"
                        },
                        agentName: {
                            type: "string",
                            description: "Agent name (optional, for agent-level search)"
                        }
                    },
                    required: ["tag"]
                }
            },
            {
                name: "list_tags",
                description: "List all tags with their usage counts",
                inputSchema: {
                    type: "object",
                    properties: {
                        level: {
                            type: "string",
                            enum: ["global", "workspace", "agent"],
                            description: "Storage level (optional, lists tags from all levels if not specified)"
                        },
                        agentName: {
                            type: "string",
                            description: "Agent name (optional, for agent-level tags)"
                        }
                    },
                    required: []
                }
            }
        ];
    }

    /**
     * 处理 MCP 请求
     */
    async handleRequest(request) {
        const { method, params, id } = request;

        try {
            let result;

            switch (method) {
                case 'initialize':
                    result = {
                        protocolVersion: "2024-11-05",
                        capabilities: {
                            tools: {}
                        },
                        serverInfo: {
                            name: "wbw-skill-notes",
                            version: "1.0.0"
                        }
                    };
                    break;

                case 'tools/list':
                    result = { tools: this.tools };
                    break;

                case 'tools/call':
                    result = await this.handleToolCall(params);
                    break;

                default:
                    throw new Error(`Unknown method: ${method}`);
            }

            return { jsonrpc: "2.0", id, result };

        } catch (error) {
            return {
                jsonrpc: "2.0",
                id,
                error: {
                    code: -32000,
                    message: error.message
                }
            };
        }
    }

    /**
     * 处理工具调用
     */
    async handleToolCall(params) {
        const { name, arguments: args } = params;

        try {
            let result;

            switch (name) {
                case 'create_note':
                    result = this.manager.createNote(
                        args.level,
                        args.title,
                        args.content,
                        args.agentName,
                        args.tags
                    );
                    break;

                case 'list_notes':
                    result = this.manager.listNotes(args.level, args.agentName);
                    break;

                case 'read_note':
                    result = this.manager.readNote(args.level, args.id, args.agentName);
                    break;

                case 'update_note':
                    result = this.manager.updateNote(
                        args.level,
                        args.id,
                        args.content,
                        args.agentName,
                        args.tags
                    );
                    break;

                case 'delete_note':
                    result = this.manager.deleteNote(args.level, args.id, args.agentName);
                    break;

                case 'jumpto':
                    result = this.manager.readNote(
                        args.level,
                        args.id,
                        args.agentName,
                        false
                    );
                    // 添加跳转位置信息
                    result.jumpTarget = {
                        level: args.level,
                        id: args.id,
                        agent: args.agentName,
                        lineno: args.lineno || 1,
                        column: args.column || 1
                    };
                    // 读取指定行的内容
                    if (args.lineno) {
                        const lines = result.content.split('\n');
                        if (args.lineno <= lines.length) {
                            result.targetLine = lines[args.lineno - 1];
                            result.targetLineContent = lines.slice(
                                Math.max(0, args.lineno - 3),
                                Math.min(lines.length, args.lineno + 2)
                            ).join('\n');
                        }
                    }
                    break;

                case 'parse_jumps':
                    const jumps = JumpToParser.parse(args.content);
                    result = {
                        jumps: jumps.map(j => ({
                            original: j.fullMatch,
                            target: JumpToParser.toTarget(j),
                            description: JumpToParser.toDescription(j)
                        })),
                        count: jumps.length
                    };
                    break;

                case 'search_notes':
                    const searchOptions = {
                        caseSensitive: args.caseSensitive || false,
                        wholeWord: args.wholeWord || false,
                        regex: args.regex || false,
                        searchIn: args.searchIn || 'all'
                    };
                    const searchResults = this.manager.searchNotes(
                        args.query,
                        args.level,
                        args.agentName,
                        searchOptions
                    );
                    result = {
                        query: args.query,
                        results: searchResults,
                        count: searchResults.length,
                        totalMatches: searchResults.reduce((sum, r) => sum + r.matchCount, 0)
                    };
                    break;

                case 'list_notes_by_tag':
                    const tagResults = this.manager.listNotesByTag(
                        args.tag,
                        args.level,
                        args.agentName
                    );
                    result = {
                        tag: args.tag,
                        notes: tagResults,
                        count: tagResults.length
                    };
                    break;

                case 'list_tags':
                    const tags = this.manager.listTags(
                        args.level,
                        args.agentName
                    );
                    result = {
                        tags: Object.entries(tags).map(([tag, count]) => ({ tag, count })),
                        count: Object.keys(tags).length
                    };
                    break;

                default:
                    throw new Error(`Unknown tool: ${name}`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2)
                    }
                ]
            };

        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    }

    /**
     * 启动服务器（stdio 模式）
     */
    start() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });

        rl.on('line', async (line) => {
            try {
                const request = JSON.parse(line);
                const response = await this.handleRequest(request);
                process.stdout.write(JSON.stringify(response) + '\n');
            } catch (error) {
                process.stdout.write(JSON.stringify({
                    jsonrpc: "2.0",
                    id: null,
                    error: {
                        code: -32700,
                        message: "Parse error"
                    }
                }) + '\n');
            }
        });

        process.stderr.write('WBW Skill MCP Server started\n');
    }
}

// 启动服务器
const server = new MCPServer();
server.start();