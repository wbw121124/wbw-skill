/**
 * WBW Skill - 通用笔记管理工具插件
 */

import { NotesManager } from '../core/notes-manager';
import { JumpParser } from '../core/jump-parser';
import { StorageLevel } from '../types';

export class NotesPlugin {
    private manager: NotesManager;

    constructor() {
        this.manager = new NotesManager();
    }

    getTools(): Array<{ name: string; description: string; inputSchema: any }> {
        return [
            {
                name: 'notes_create',
                description: '创建新笔记',
                inputSchema: {
                    type: 'object',
                    properties: {
                        level: { type: 'string', enum: ['global', 'workspace', 'agent'] },
                        title: { type: 'string' },
                        content: { type: 'string' },
                        agentName: { type: 'string' },
                        tags: { type: 'array', items: { type: 'string' } },
                        template: { type: 'string' }
                    },
                    required: ['title']
                }
            },
            {
                name: 'notes_list',
                description: '列出笔记',
                inputSchema: {
                    type: 'object',
                    properties: {
                        level: { type: 'string', enum: ['global', 'workspace', 'agent'] },
                        agentName: { type: 'string' },
                        sort: { type: 'string', enum: ['created', 'updated', 'title', 'id'] },
                        order: { type: 'string', enum: ['asc', 'desc'] }
                    }
                }
            },
            {
                name: 'notes_read',
                description: '读取笔记',
                inputSchema: {
                    type: 'object',
                    properties: {
                        level: { type: 'string', enum: ['global', 'workspace', 'agent'] },
                        id: { type: 'string' },
                        agentName: { type: 'string' }
                    },
                    required: ['id']
                }
            },
            {
                name: 'notes_update',
                description: '更新笔记',
                inputSchema: {
                    type: 'object',
                    properties: {
                        level: { type: 'string', enum: ['global', 'workspace', 'agent'] },
                        id: { type: 'string' },
                        content: { type: 'string' },
                        agentName: { type: 'string' },
                        tags: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['id', 'content']
                }
            },
            {
                name: 'notes_delete',
                description: '删除笔记',
                inputSchema: {
                    type: 'object',
                    properties: {
                        level: { type: 'string', enum: ['global', 'workspace', 'agent'] },
                        id: { type: 'string' },
                        agentName: { type: 'string' }
                    },
                    required: ['id']
                }
            },
            {
                name: 'notes_search',
                description: '搜索笔记',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' },
                        level: { type: 'string', enum: ['global', 'workspace', 'agent'] },
                        agentName: { type: 'string' },
                        caseSensitive: { type: 'boolean' },
                        wholeWord: { type: 'boolean' },
                        regex: { type: 'boolean' },
                        searchIn: { type: 'string', enum: ['all', 'title', 'content'] }
                    },
                    required: ['query']
                }
            },
            {
                name: 'notes_stats',
                description: '获取笔记统计',
                inputSchema: {
                    type: 'object',
                    properties: {
                        level: { type: 'string', enum: ['global', 'workspace', 'agent'] },
                        agentName: { type: 'string' },
                        includeTags: { type: 'boolean' }
                    }
                }
            }
        ];
    }

    async executeTool(name: string, args: any): Promise<any> {
        try {
            let result: any;
            
            switch (name) {
                case 'notes_create':
                    result = this.manager.createNote(
                        (args.level || 'workspace') as StorageLevel,
                        args.title,
                        args.content || '',
                        args.agentName,
                        args.tags,
                        args.template
                    );
                    break;
                    
                case 'notes_list':
                    result = this.manager.listNotes(
                        (args.level || 'workspace') as StorageLevel,
                        args.agentName,
                        { sort: args.sort, order: args.order }
                    );
                    break;
                    
                case 'notes_read':
                    result = this.manager.readNote(
                        (args.level || 'workspace') as StorageLevel,
                        args.id,
                        args.agentName
                    );
                    break;
                    
                case 'notes_update':
                    result = this.manager.updateNote(
                        (args.level || 'workspace') as StorageLevel,
                        args.id,
                        args.content,
                        args.agentName,
                        args.tags
                    );
                    break;
                    
                case 'notes_delete':
                    result = this.manager.deleteNote(
                        (args.level || 'workspace') as StorageLevel,
                        args.id,
                        args.agentName
                    );
                    break;
                    
                case 'notes_search':
                    result = this.manager.searchNotes(
                        args.query,
                        args.level as StorageLevel || null,
                        args.agentName,
                        {
                            caseSensitive: args.caseSensitive,
                            wholeWord: args.wholeWord,
                            regex: args.regex,
                            searchIn: args.searchIn
                        }
                    );
                    break;
                    
                case 'notes_stats':
                    result = this.manager.getStats(
                        args.level as StorageLevel || undefined,
                        args.agentName,
                        args.includeTags
                    );
                    break;
                    
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
            
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
}

export default NotesPlugin;
