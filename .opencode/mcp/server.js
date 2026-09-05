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
            id,
            title,
            level,
            agentName,
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
                agentName: frontmatter.agent || agentName
            });
        }
        
        notes.sort((a, b) => new Date(b.created) - new Date(a.created));
        
        return notes;
    }

    readNote(level, id, agentName = null) {
        const dir = this.getDir(level, agentName);
        const filePath = path.join(dir, `${id}.md`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Note not found: ${id}`);
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const { frontmatter, content: noteContent } = this.parseNote(content);
        
        return {
            id: frontmatter.id || id,
            title: frontmatter.title || 'Untitled',
            content: noteContent,
            created: frontmatter.created,
            updated: frontmatter.updated,
            level: frontmatter.level || level,
            agentName: frontmatter.agent || agentName
        };
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
            id: frontmatter.id || id,
            title: frontmatter.title || 'Untitled',
            level: frontmatter.level || level,
            agentName: frontmatter.agent || agentName,
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
                        args.agentName
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
                        args.agentName
                    );
                    break;

                case 'delete_note':
                    result = this.manager.deleteNote(args.level, args.id, args.agentName);
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