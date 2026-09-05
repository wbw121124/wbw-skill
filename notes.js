#!/usr/bin/env node

/**
 * WBW Skill - LLM 记事本/备忘录系统
 * 
 * 功能：为 LLM 提供记事本/备忘录功能，支持全局、工作区、代理三个存储级别
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
 * 负责笔记的增删改查操作
 */
class NotesManager {
    constructor() {
        // 全局笔记存储路径：~/.wbw-skill/notes/global/
        this.globalDir = path.join(os.homedir(), '.wbw-skill', 'notes', 'global');
        
        // 工作区笔记存储路径：当前项目/.wbw-skill/notes/workspace/
        this.workspaceDir = path.join(process.cwd(), '.wbw-skill', 'notes', 'workspace');
        
        // 代理笔记存储路径：当前项目/.wbw-skill/notes/agent/<agent-name>/
        this.agentDir = path.join(process.cwd(), '.wbw-skill', 'notes', 'agent');
    }

    /**
     * 根据级别获取对应的存储目录
     * @param {string} level - 存储级别：global（全局）、workspace（工作区）、agent（代理）
     * @param {string|null} agentName - 代理名称，仅 agent 级别需要
     * @returns {string} 对应的存储目录路径
     */
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

    /**
     * 生成唯一的笔记 ID
     * @returns {string} 格式：note-{时间戳}-{随机字符串}
     */
    generateId() {
        return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 解析 Markdown 笔记文件，提取前置元数据和内容
     * @param {string} content - 笔记文件的完整内容
     * @returns {Object} 包含 frontmatter（元数据）和 content（内容）的对象
     */
    parseNote(content) {
        // 匹配 YAML 前置元数据的正则表达式
        const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);
        
        // 如果没有找到前置元数据，返回空元数据和原始内容
        if (!match) {
            return { frontmatter: {}, content: content };
        }

        const frontmatter = {};
        const lines = match[1].split('\n');
        
        // 解析每一行的键值对
        for (const line of lines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                
                // 移除引号（如果有）
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

    /**
     * 创建新笔记
     * @param {string} level - 存储级别
     * @param {string} title - 笔记标题
     * @param {string} content - 笔记内容
     * @param {string|null} agentName - 代理名称（仅 agent 级别需要）
     * @returns {Object} 创建结果，包含笔记 ID、标题、路径等信息
     */
    createNote(level, title, content, agentName = null) {
        // 获取存储目录并确保目录存在
        const dir = this.getDir(level, agentName);
        fs.mkdirSync(dir, { recursive: true });
        
        // 生成唯一 ID 和当前时间戳
        const id = this.generateId();
        const now = new Date().toISOString();
        
        // 构建 YAML 前置元数据
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
        
        // 组合完整笔记内容
        const noteContent = `${frontmatter}\n\n${content}`;
        const filename = `${id}.md`;
        const filePath = path.join(dir, filename);
        
        // 写入文件
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

    /**
     * 列出指定级别的所有笔记
     * @param {string} level - 存储级别
     * @param {string|null} agentName - 代理名称（仅 agent 级别需要）
     * @returns {Object} 包含笔记列表和数量的对象
     */
    listNotes(level, agentName = null) {
        const dir = this.getDir(level, agentName);
        
        // 如果目录不存在，返回空列表
        if (!fs.existsSync(dir)) {
            return { notes: [], count: 0 };
        }
        
        // 读取目录中的所有 .md 文件
        const files = fs.readdirSync(dir).filter(file => file.endsWith('.md'));
        const notes = [];
        
        // 解析每个笔记文件的元数据
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
        
        // 按创建时间降序排序（最新的在前）
        notes.sort((a, b) => new Date(b.created) - new Date(a.created));
        
        return { notes, count: notes.length };
    }

    /**
     * 读取指定笔记的内容
     * @param {string} level - 存储级别
     * @param {string} id - 笔记 ID
     * @param {string|null} agentName - 代理名称（仅 agent 级别需要）
     * @returns {Object} 笔记的完整信息，包括元数据和内容
     */
    readNote(level, id, agentName = null) {
        const dir = this.getDir(level, agentName);
        const filePath = path.join(dir, `${id}.md`);
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            throw new Error(`Note not found: ${id}`);
        }
        
        // 读取并解析笔记文件
        const content = fs.readFileSync(filePath, 'utf8');
        const { frontmatter, content: noteContent } = this.parseNote(content);
        
        return {
            id: frontmatter.id || id,
            title: frontmatter.title || 'Untitled',
            content: noteContent,
            created: frontmatter.created,
            updated: frontmatter.updated,
            level: frontmatter.level || level,
            agentName: frontmatter.agent || agentName,
            path: filePath
        };
    }

    /**
     * 更新指定笔记的内容
     * @param {string} level - 存储级别
     * @param {string} id - 笔记 ID
     * @param {string} content - 新的笔记内容
     * @param {string|null} agentName - 代理名称（仅 agent 级别需要）
     * @returns {Object} 更新结果
     */
    updateNote(level, id, content, agentName = null) {
        const dir = this.getDir(level, agentName);
        const filePath = path.join(dir, `${id}.md`);
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            throw new Error(`Note not found: ${id}`);
        }
        
        // 读取现有内容并解析元数据
        const existingContent = fs.readFileSync(filePath, 'utf8');
        const { frontmatter } = this.parseNote(existingContent);
        
        // 更新元数据中的时间戳，保留其他字段
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
        
        // 组合并写入更新后的内容
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

    /**
     * 删除指定笔记
     * @param {string} level - 存储级别
     * @param {string} id - 笔记 ID
     * @param {string|null} agentName - 代理名称（仅 agent 级别需要）
     * @returns {Object} 删除结果
     */
    deleteNote(level, id, agentName = null) {
        const dir = this.getDir(level, agentName);
        const filePath = path.join(dir, `${id}.md`);
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            throw new Error(`Note not found: ${id}`);
        }
        
        // 删除文件
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
 * 解析命令行参数
 * @param {string[]} args - 命令行参数数组
 * @returns {Object} 解析后的参数对象
 */
function parseArgs(args) {
    const parsed = {};
    let i = 2; // 跳过 node 和脚本名称
    
    while (i < args.length) {
        const arg = args[i];
        
        if (arg.startsWith('--')) {
            // 处理 --key value 或 --flag 格式的参数
            const key = arg.substring(2);
            const value = args[i + 1];
            
            if (value && !value.startsWith('--')) {
                parsed[key] = value;
                i += 2;
            } else {
                parsed[key] = true;
                i += 1;
            }
        } else {
            // 处理位置参数（命令）
            if (!parsed.command) {
                parsed.command = arg;
            }
            i += 1;
        }
    }
    
    return parsed;
}

/**
 * 主函数
 * 处理命令行输入并执行相应的笔记操作
 */
function main() {
    const args = parseArgs(process.argv);
    const manager = new NotesManager();
    
    try {
        switch (args.command) {
            case 'create':
                // 创建笔记命令
                if (!args.title || !args.content) {
                    console.error('Error: --title and --content are required for create command');
                    process.exit(1);
                }
                
                const createResult = manager.createNote(
                    args.level || 'workspace',
                    args.title,
                    args.content,
                    args['agent-name']
                );
                
                console.log(JSON.stringify(createResult, null, 2));
                break;
                
            case 'list':
                // 列出笔记命令
                const listResult = manager.listNotes(
                    args.level || 'workspace',
                    args['agent-name']
                );
                
                console.log(JSON.stringify(listResult, null, 2));
                break;
                
            case 'read':
                // 读取笔记命令
                if (!args.id) {
                    console.error('Error: --id is required for read command');
                    process.exit(1);
                }
                
                const readResult = manager.readNote(
                    args.level || 'workspace',
                    args.id,
                    args['agent-name']
                );
                
                console.log(JSON.stringify(readResult, null, 2));
                break;
                
            case 'update':
                // 更新笔记命令
                if (!args.id || !args.content) {
                    console.error('Error: --id and --content are required for update command');
                    process.exit(1);
                }
                
                const updateResult = manager.updateNote(
                    args.level || 'workspace',
                    args.id,
                    args.content,
                    args['agent-name']
                );
                
                console.log(JSON.stringify(updateResult, null, 2));
                break;
                
            case 'delete':
                // 删除笔记命令
                if (!args.id) {
                    console.error('Error: --id is required for delete command');
                    process.exit(1);
                }
                
                const deleteResult = manager.deleteNote(
                    args.level || 'workspace',
                    args.id,
                    args['agent-name']
                );
                
                console.log(JSON.stringify(deleteResult, null, 2));
                break;
                
            case 'jumpto':
                // 跳转到笔记指定位置
                if (!args.id) {
                    console.error('Error: --id is required for jumpto command');
                    process.exit(1);
                }
                
                const jumptoResult = manager.readNote(
                    args.level || 'workspace',
                    args.id,
                    args['agent-name']
                );
                
                // 添加跳转位置信息
                jumptoResult.jumpTarget = {
                    level: args.level || 'workspace',
                    id: args.id,
                    agent: args['agent-name'],
                    lineno: args.lineno ? parseInt(args.lineno) : 1,
                    column: args.column ? parseInt(args.column) : 1
                };
                
                // 读取指定行的内容
                if (args.lineno) {
                    const lines = jumptoResult.content.split('\n');
                    const lineNum = parseInt(args.lineno);
                    if (lineNum <= lines.length) {
                        jumptoResult.targetLine = lines[lineNum - 1];
                        jumptoResult.targetLineContent = lines.slice(
                            Math.max(0, lineNum - 3),
                            Math.min(lines.length, lineNum + 2)
                        ).join('\n');
                    }
                }
                
                console.log(JSON.stringify(jumptoResult, null, 2));
                break;
                
            case 'parse-jumps':
                // 解析跳转语法
                if (!args.content) {
                    console.error('Error: --content is required for parse-jumps command');
                    process.exit(1);
                }
                
                const jumps = JumpToParser.parse(args.content);
                const parseResult = {
                    jumps: jumps.map(j => ({
                        original: j.fullMatch,
                        target: JumpToParser.toTarget(j),
                        description: JumpToParser.toDescription(j)
                    })),
                    count: jumps.length
                };
                
                console.log(JSON.stringify(parseResult, null, 2));
                break;
                
            default:
                // 无效命令，显示使用帮助
                console.error('Error: Invalid command. Use create, list, read, update, delete, jumpto, or parse-jumps');
                console.error('Usage: node notes.js <command> [options]');
                console.error('Commands:');
                console.error('  create --level <global|workspace|agent> --title "<title>" --content "<content>" [--agent-name "<agent-name>"]');
                console.error('  list --level <global|workspace|agent> [--agent-name "<agent-name>"]');
                console.error('  read --level <global|workspace|agent> --id "<note-id>" [--agent-name "<agent-name>"]');
                console.error('  update --level <global|workspace|agent> --id "<note-id>" --content "<content>" [--agent-name "<agent-name>"]');
                console.error('  delete --level <global|workspace|agent> --id "<note-id>" [--agent-name "<agent-name>"]');
                console.error('  jumpto --level <global|workspace|agent> --id "<note-id>" [--lineno <line>] [--column <col>] [--agent-name "<agent-name>"]');
                console.error('  parse-jumps --content "<content-with-jumps>"');
                process.exit(1);
        }
    } catch (error) {
        // 捕获并显示错误信息
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

// 当直接运行此脚本时执行主函数
if (require.main === module) {
    main();
}

// 导出 NotesManager 类供其他模块使用
module.exports = NotesManager;