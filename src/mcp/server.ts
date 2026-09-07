#!/usr/bin/env node

/**
 * WBW Skill - MCP 服务器
 */

import * as readline from 'readline';
import { NotesManager } from '../core/notes-manager';
import { JumpParser } from '../core/jump-parser';
import { StorageLevel } from '../types';

const manager = new NotesManager();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function sendResponse(id: number, result: any): void {
    const response = {
        jsonrpc: '2.0',
        id,
        result
    };
    process.stdout.write(JSON.stringify(response) + '\n');
}

function sendError(id: number, code: number, message: string): void {
    const response = {
        jsonrpc: '2.0',
        id,
        error: { code, message }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
}

function handleRequest(request: any): void {
    const { id, method, params } = request;

    switch (method) {
        case 'initialize':
            sendResponse(id, {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: {}
                },
                serverInfo: {
                    name: 'wbw-skill',
                    version: '1.0.0'
                }
            });
            break;

        case 'tools/list':
            sendResponse(id, {
                tools: [
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
                ]
            });
            break;

        case 'tools/call': {
            const { name, arguments: args } = params;
            
            try {
                let result: any;
                
                switch (name) {
                    case 'notes_create':
                        result = manager.createNote(
                            (args.level || 'workspace') as StorageLevel,
                            args.title,
                            args.content || '',
                            args.agentName,
                            args.tags,
                            args.template
                        );
                        break;
                        
                    case 'notes_list':
                        result = manager.listNotes(
                            (args.level || 'workspace') as StorageLevel,
                            args.agentName,
                            { sort: args.sort, order: args.order }
                        );
                        break;
                        
                    case 'notes_read':
                        result = manager.readNote(
                            (args.level || 'workspace') as StorageLevel,
                            args.id,
                            args.agentName
                        );
                        break;
                        
                    case 'notes_update':
                        result = manager.updateNote(
                            (args.level || 'workspace') as StorageLevel,
                            args.id,
                            args.content,
                            args.agentName,
                            args.tags
                        );
                        break;
                        
                    case 'notes_delete':
                        result = manager.deleteNote(
                            (args.level || 'workspace') as StorageLevel,
                            args.id,
                            args.agentName
                        );
                        break;
                        
                    case 'notes_search':
                        result = manager.searchNotes(
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
                        result = manager.getStats(
                            args.level as StorageLevel || undefined,
                            args.agentName,
                            args.includeTags
                        );
                        break;
                        
                    default:
                        sendError(id, -32601, `Unknown tool: ${name}`);
                        return;
                }
                
                sendResponse(id, {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                });
            } catch (error) {
                sendError(id, -32000, (error as Error).message);
            }
            break;
        }

        default:
            sendError(id, -32601, `Method not found: ${method}`);
    }
}

rl.on('line', (line) => {
    try {
        const request = JSON.parse(line);
        handleRequest(request);
    } catch (error) {
        // Ignore invalid JSON
    }
});

process.stderr.write('WBW Skill MCP Server started\n');
