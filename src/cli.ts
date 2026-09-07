#!/usr/bin/env node

/**
 * WBW Skill - CLI 入口
 */

import { NotesManager } from './core/notes-manager';
import { JumpParser } from './core/jump-parser';
import { CLIArgs, StorageLevel } from './types';

function parseArgs(args: string[]): CLIArgs {
    const parsed: CLIArgs = {};
    let i = 2;
    
    while (i < args.length) {
        const arg = args[i];
        
        if (arg.startsWith('--')) {
            const key = arg.substring(2);
            const value = args[i + 1];
            
            if (value && !value.startsWith('--')) {
                (parsed as any)[key] = value;
                i += 2;
            } else {
                (parsed as any)[key] = true;
                i += 1;
            }
        } else {
            if (!parsed.command) {
                parsed.command = arg;
            }
            i += 1;
        }
    }
    
    return parsed;
}

function main(): void {
    const args = parseArgs(process.argv);
    const manager = new NotesManager();
    
    try {
        switch (args.command) {
            case 'create': {
                if (!args.title) {
                    console.error('Error: --title is required for create command');
                    process.exit(1);
                }
                
                const createTags = args.tags ? args.tags.split(',').map(t => t.trim()) : [];
                
                const createResult = manager.createNote(
                    (args.level || 'workspace') as StorageLevel,
                    args.title,
                    args.content || '',
                    args['agent-name'],
                    createTags,
                    args.template
                );
                
                console.log(JSON.stringify(createResult, null, 2));
                break;
            }
                
            case 'list': {
                let listResult;
                if (args.tag) {
                    listResult = {
                        notes: manager.listNotesByTag(args.tag, args.level as StorageLevel, args['agent-name']),
                        tag: args.tag
                    };
                } else {
                    const listOptions = {
                        sort: (args.sort || 'created') as any,
                        order: (args.order || 'desc') as any
                    };
                    listResult = manager.listNotes(
                        (args.level || 'workspace') as StorageLevel,
                        args['agent-name'],
                        listOptions
                    );
                }
                
                console.log(JSON.stringify(listResult, null, 2));
                break;
            }
                
            case 'read': {
                if (!args.id) {
                    console.error('Error: --id is required for read command');
                    process.exit(1);
                }
                
                const readResult = manager.readNote(
                    (args.level || 'workspace') as StorageLevel,
                    args.id,
                    args['agent-name']
                );
                
                console.log(JSON.stringify(readResult, null, 2));
                break;
            }
                
            case 'update': {
                if (!args.id || !args.content) {
                    console.error('Error: --id and --content are required for update command');
                    process.exit(1);
                }
                
                const updateTags = args.tags ? args.tags.split(',').map(t => t.trim()) : undefined;
                
                const updateResult = manager.updateNote(
                    (args.level || 'workspace') as StorageLevel,
                    args.id,
                    args.content,
                    args['agent-name'],
                    updateTags
                );
                
                console.log(JSON.stringify(updateResult, null, 2));
                break;
            }
                
            case 'delete': {
                if (!args.id) {
                    console.error('Error: --id is required for delete command');
                    process.exit(1);
                }
                
                const deleteResult = manager.deleteNote(
                    (args.level || 'workspace') as StorageLevel,
                    args.id,
                    args['agent-name']
                );
                
                console.log(JSON.stringify(deleteResult, null, 2));
                break;
            }
                
            case 'tags': {
                const tagsResult = manager.listTags(args.level as StorageLevel, args['agent-name']);
                const tagsArray = Object.entries(tagsResult).map(([tag, count]) => ({ tag, count }));
                tagsArray.sort((a, b) => b.count - a.count);
                
                console.log(JSON.stringify({
                    tags: tagsArray,
                    count: tagsArray.length
                }, null, 2));
                break;
            }
                
            case 'jumpto': {
                if (!args.id) {
                    console.error('Error: --id is required for jumpto command');
                    process.exit(1);
                }
                
                const jumptoResult = manager.readNote(
                    (args.level || 'workspace') as StorageLevel,
                    args.id,
                    args['agent-name']
                );
                
                (jumptoResult as any).jumpTarget = {
                    level: args.level || 'workspace',
                    id: args.id,
                    agent: args['agent-name'],
                    lineno: args.lineno ? parseInt(args.lineno) : 1,
                    column: args.column ? parseInt(args.column) : 1
                };
                
                if (args.lineno) {
                    const lines = jumptoResult.content.split('\n');
                    const lineNum = parseInt(args.lineno);
                    if (lineNum <= lines.length) {
                        (jumptoResult as any).targetLine = lines[lineNum - 1];
                        (jumptoResult as any).targetLineContent = lines.slice(
                            Math.max(0, lineNum - 3),
                            Math.min(lines.length, lineNum + 2)
                        ).join('\n');
                    }
                }
                
                console.log(JSON.stringify(jumptoResult, null, 2));
                break;
            }
                
            case 'parse-jumps': {
                if (!args.content) {
                    console.error('Error: --content is required for parse-jumps command');
                    process.exit(1);
                }
                
                const jumps = JumpParser.parse(args.content);
                const parseResult = {
                    jumps: jumps.map(j => ({
                        original: j.fullMatch,
                        target: JumpParser.toTarget(j),
                        description: JumpParser.toDescription(j)
                    })),
                    count: jumps.length
                };
                
                console.log(JSON.stringify(parseResult, null, 2));
                break;
            }
                
            case 'search': {
                if (!args.query) {
                    console.error('Error: --query is required for search command');
                    process.exit(1);
                }
                
                const searchOptions = {
                    caseSensitive: args['case-sensitive'] === 'true',
                    wholeWord: args['whole-word'] === 'true',
                    regex: args.regex === 'true',
                    searchIn: (args['search-in'] || 'all') as 'all' | 'title' | 'content'
                };
                
                const searchResults = manager.searchNotes(
                    args.query,
                    args.level as StorageLevel || null,
                    args['agent-name'],
                    searchOptions
                );
                
                console.log(JSON.stringify({
                    query: args.query,
                    results: searchResults,
                    count: searchResults.length,
                    totalMatches: searchResults.reduce((sum, r) => sum + r.matchCount, 0)
                }, null, 2));
                break;
            }
                
            case 'templates': {
                const templatesResult = manager.listTemplates();
                console.log(JSON.stringify(templatesResult, null, 2));
                break;
            }
                
            case 'template': {
                if (!args.name) {
                    console.error('Error: --name is required for template command');
                    process.exit(1);
                }
                
                try {
                    const templateResult = manager.getTemplate(args.name);
                    console.log(JSON.stringify(templateResult, null, 2));
                } catch (error) {
                    console.error(`Error: ${(error as Error).message}`);
                    process.exit(1);
                }
                break;
            }
                
            case 'batch-delete': {
                if (!args.ids) {
                    console.error('Error: --ids is required for batch-delete command');
                    process.exit(1);
                }
                
                const deleteIds = args.ids.split(',').map(id => id.trim());
                const batchDeleteResult = manager.batchDelete(
                    deleteIds,
                    (args.level || 'workspace') as StorageLevel,
                    args['agent-name']
                );
                
                console.log(JSON.stringify(batchDeleteResult, null, 2));
                break;
            }
                
            case 'batch-move': {
                if (!args.ids || !args.to) {
                    console.error('Error: --ids and --to are required for batch-move command');
                    process.exit(1);
                }
                
                const moveIds = args.ids.split(',').map(id => id.trim());
                const batchMoveResult = manager.batchMove(
                    moveIds,
                    (args.level || 'workspace') as StorageLevel,
                    args.to as StorageLevel,
                    args['agent-name'],
                    args['to-agent-name']
                );
                
                console.log(JSON.stringify(batchMoveResult, null, 2));
                break;
            }
                
            case 'batch-tag': {
                if (!args.ids || !args['add-tags']) {
                    console.error('Error: --ids and --add-tags are required for batch-tag command');
                    process.exit(1);
                }
                
                const tagIds = args.ids.split(',').map(id => id.trim());
                const addTags = args['add-tags'].split(',').map(t => t.trim());
                const batchTagResult = manager.batchAddTags(
                    tagIds,
                    addTags,
                    (args.level || 'workspace') as StorageLevel,
                    args['agent-name']
                );
                
                console.log(JSON.stringify(batchTagResult, null, 2));
                break;
            }
                
            case 'batch-untag': {
                if (!args.ids || !args['remove-tags']) {
                    console.error('Error: --ids and --remove-tags are required for batch-untag command');
                    process.exit(1);
                }
                
                const untagIds = args.ids.split(',').map(id => id.trim());
                const removeTags = args['remove-tags'].split(',').map(t => t.trim());
                const batchUntagResult = manager.batchRemoveTags(
                    untagIds,
                    removeTags,
                    (args.level || 'workspace') as StorageLevel,
                    args['agent-name']
                );
                
                console.log(JSON.stringify(batchUntagResult, null, 2));
                break;
            }
                
            case 'export': {
                if (!args.id && !args.level) {
                    console.error('Error: --id or --level is required for export command');
                    process.exit(1);
                }
                
                if (!args.output) {
                    console.error('Error: --output is required for export command');
                    process.exit(1);
                }
                
                if (args.id) {
                    if (args.format === 'json') {
                        const exportJsonResult = manager.exportNoteAsJson(
                            (args.level || 'workspace') as StorageLevel,
                            args.id,
                            args.output,
                            args['agent-name']
                        );
                        console.log(JSON.stringify(exportJsonResult, null, 2));
                    } else {
                        const exportResult = manager.exportNote(
                            (args.level || 'workspace') as StorageLevel,
                            args.id,
                            args.output,
                            args['agent-name']
                        );
                        console.log(JSON.stringify(exportResult, null, 2));
                    }
                } else {
                    manager.exportNotesAsZip(
                        args.level as StorageLevel,
                        args.output,
                        args['agent-name']
                    ).then(result => {
                        console.log(JSON.stringify(result, null, 2));
                    }).catch(error => {
                        console.error(`Error: ${(error as Error).message}`);
                        process.exit(1);
                    });
                }
                break;
            }
                
            case 'import': {
                if (!args.file) {
                    console.error('Error: --file is required for import command');
                    process.exit(1);
                }
                
                if (args.file.endsWith('.zip')) {
                    manager.importNotesFromZip(
                        args.file,
                        (args.level || 'workspace') as StorageLevel,
                        args['agent-name']
                    ).then(result => {
                        console.log(JSON.stringify(result, null, 2));
                    }).catch(error => {
                        console.error(`Error: ${(error as Error).message}`);
                        process.exit(1);
                    });
                } else if (args.file.endsWith('.json')) {
                    const importJsonResult = manager.importNoteFromJson(
                        args.file,
                        (args.level || 'workspace') as StorageLevel,
                        args['agent-name']
                    );
                    console.log(JSON.stringify(importJsonResult, null, 2));
                } else {
                    const importResult = manager.importNoteFromMarkdown(
                        args.file,
                        (args.level || 'workspace') as StorageLevel,
                        args['agent-name']
                    );
                    console.log(JSON.stringify(importResult, null, 2));
                }
                break;
            }
                
            case 'history': {
                if (!args.id) {
                    console.error('Error: --id is required for history command');
                    process.exit(1);
                }
                
                if (args.version) {
                    const historyVersionResult = manager.readHistory(
                        (args.level || 'workspace') as StorageLevel,
                        args.id,
                        parseInt(args.version),
                        args['agent-name']
                    );
                    console.log(JSON.stringify(historyVersionResult, null, 2));
                } else {
                    const historyResult = manager.listHistory(
                        (args.level || 'workspace') as StorageLevel,
                        args.id,
                        args['agent-name']
                    );
                    console.log(JSON.stringify(historyResult, null, 2));
                }
                break;
            }
                
            case 'rollback': {
                if (!args.id || !args.version) {
                    console.error('Error: --id and --version are required for rollback command');
                    process.exit(1);
                }
                
                const rollbackResult = manager.rollbackHistory(
                    (args.level || 'workspace') as StorageLevel,
                    args.id,
                    parseInt(args.version),
                    args['agent-name']
                );
                console.log(JSON.stringify(rollbackResult, null, 2));
                break;
            }
                
            case 'stats': {
                const statsResult = manager.getStats(
                    args.level as StorageLevel || undefined,
                    args['agent-name'],
                    args.tags === 'true'
                );
                console.log(JSON.stringify(statsResult, null, 2));
                break;
            }
                
            default:
                console.error('Error: Invalid command. Use create, list, read, update, delete, tags, jumpto, parse-jumps, search, templates, or template');
                console.error('Usage: wbw-notes <command> [options]');
                process.exit(1);
        }
    } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
    }
}

main();
