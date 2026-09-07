/**
 * 索引系统模块
 * 提供笔记索引功能，加速搜索和列表
 */

import * as fs from 'fs';
import * as path from 'path';
import { NoteMetadata, StorageLevel } from '../types';

/**
 * 索引接口
 */
export interface NotesIndex {
    version: number;
    lastUpdated: string;
    notes: Record<string, NoteMetadata>;
}

/**
 * 索引管理器类
 */
export class IndexManager {
    private indexDir: string;
    private indexFile: string;
    private index: NotesIndex;

    constructor(workspaceDir: string) {
        this.indexDir = path.join(workspaceDir, '.wbw-skill');
        this.indexFile = path.join(this.indexDir, 'index.json');
        this.index = this.loadIndex();
    }

    /**
     * 加载索引文件
     */
    private loadIndex(): NotesIndex {
        if (fs.existsSync(this.indexFile)) {
            try {
                const content = fs.readFileSync(this.indexFile, 'utf8');
                return JSON.parse(content);
            } catch (error) {
                // 如果索引文件损坏，创建新的索引
                return this.createEmptyIndex();
            }
        }
        return this.createEmptyIndex();
    }

    /**
     * 创建空索引
     */
    private createEmptyIndex(): NotesIndex {
        return {
            version: 1,
            lastUpdated: new Date().toISOString(),
            notes: {}
        };
    }

    /**
     * 保存索引文件
     */
    private saveIndex(): void {
        fs.mkdirSync(this.indexDir, { recursive: true });
        this.index.lastUpdated = new Date().toISOString();
        fs.writeFileSync(this.indexFile, JSON.stringify(this.index, null, 2), 'utf8');
    }

    /**
     * 添加笔记到索引
     */
    addNote(note: NoteMetadata): void {
        this.index.notes[note.id] = note;
        this.saveIndex();
    }

    /**
     * 从索引中移除笔记
     */
    removeNote(id: string): void {
        delete this.index.notes[id];
        this.saveIndex();
    }

    /**
     * 更新索引中的笔记
     */
    updateNote(note: NoteMetadata): void {
        this.index.notes[note.id] = note;
        this.saveIndex();
    }

    /**
     * 获取笔记
     */
    getNote(id: string): NoteMetadata | undefined {
        return this.index.notes[id];
    }

    /**
     * 获取所有笔记
     */
    getAllNotes(): NoteMetadata[] {
        return Object.values(this.index.notes);
    }

    /**
     * 按级别获取笔记
     */
    getNotesByLevel(level: StorageLevel): NoteMetadata[] {
        return Object.values(this.index.notes).filter(note => note.level === level);
    }

    /**
     * 按标签获取笔记
     */
    getNotesByTag(tag: string): NoteMetadata[] {
        return Object.values(this.index.notes).filter(note => 
            note.tags.some(t => t.toLowerCase() === tag.toLowerCase())
        );
    }

    /**
     * 搜索笔记（基于索引）
     */
    searchNotes(query: string, options: { caseSensitive?: boolean; searchIn?: 'all' | 'title' | 'content' } = {}): NoteMetadata[] {
        const { caseSensitive = false, searchIn = 'all' } = options;
        
        return Object.values(this.index.notes).filter(note => {
            const searchText = searchIn === 'title' ? note.title : 
                              searchIn === 'content' ? note.title : // 索引中不存储内容，只搜索标题
                              note.title;
            
            if (caseSensitive) {
                return searchText.includes(query);
            } else {
                return searchText.toLowerCase().includes(query.toLowerCase());
            }
        });
    }

    /**
     * 获取索引统计信息
     */
    getStats(): { totalNotes: number; lastUpdated: string; version: number } {
        return {
            totalNotes: Object.keys(this.index.notes).length,
            lastUpdated: this.index.lastUpdated,
            version: this.index.version
        };
    }

    /**
     * 清空索引
     */
    clearIndex(): void {
        this.index = this.createEmptyIndex();
        this.saveIndex();
    }

    /**
     * 重建索引
     */
    rebuildIndex(notesDir: string, level: StorageLevel): void {
        this.clearIndex();
        
        if (!fs.existsSync(notesDir)) {
            return;
        }
        
        const files = fs.readdirSync(notesDir).filter(file => file.endsWith('.md'));
        
        for (const file of files) {
            const filePath = path.join(notesDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // 简单解析 frontmatter
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (frontmatterMatch) {
                const frontmatter: Record<string, any> = {};
                const lines = frontmatterMatch[1].split('\n');
                
                for (const line of lines) {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > 0) {
                        const key = line.substring(0, colonIndex).trim();
                        let value = line.substring(colonIndex + 1).trim();
                        
                        if (value.startsWith('[') && value.endsWith(']')) {
                            const arrayStr = value.slice(1, -1).trim();
                            frontmatter[key] = arrayStr ? arrayStr.split(',').map(item => item.trim()) : [];
                        } else {
                            if ((value.startsWith('"') && value.endsWith('"')) || 
                                (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.slice(1, -1);
                            }
                            frontmatter[key] = value;
                        }
                    }
                }
                
                const note: NoteMetadata = {
                    id: frontmatter.id || file.replace('.md', ''),
                    title: frontmatter.title || 'Untitled',
                    created: frontmatter.created || '',
                    updated: frontmatter.updated || '',
                    level: (frontmatter.level || level) as StorageLevel,
                    agentName: frontmatter.agent,
                    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
                    pinned: frontmatter.pinned === 'true'
                };
                
                this.addNote(note);
            }
        }
    }
}
