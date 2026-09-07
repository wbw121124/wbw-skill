/**
 * 笔记元数据接口
 */
export interface NoteMetadata {
    id: string;
    title: string;
    created: string;
    updated: string;
    level: StorageLevel;
    agentName?: string;
    tags: string[];
}

/**
 * 笔记接口
 */
export interface Note extends NoteMetadata {
    content: string;
    path: string;
    jumps?: JumpTarget[];
}

/**
 * 存储级别类型
 */
export type StorageLevel = 'global' | 'workspace' | 'agent';

/**
 * 跳转目标接口
 */
export interface JumpTarget {
    level: StorageLevel;
    agent?: string;
    id: string;
    lineno: number;
    column: number;
}

/**
 * 跳转解析结果接口
 */
export interface JumpParseResult {
    fullMatch: string;
    level: StorageLevel;
    agent: string | null;
    id: string;
    lineno: number | null;
    column: number | null;
}

/**
 * 搜索选项接口
 */
export interface SearchOptions {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    regex?: boolean;
    searchIn?: 'all' | 'title' | 'content';
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
    id: string;
    title: string;
    level: StorageLevel;
    agentName?: string;
    path: string;
    matches: SearchMatch[];
    matchCount: number;
}

/**
 * 搜索匹配接口
 */
export interface SearchMatch {
    type: 'title' | 'content';
    line: number;
    column: number;
    text: string;
    context: string;
}

/**
 * 排序选项接口
 */
export interface SortOptions {
    sort?: 'created' | 'updated' | 'title' | 'id';
    order?: 'asc' | 'desc';
}

/**
 * 模板接口
 */
export interface NoteTemplate {
    name: string;
    description: string;
    content: string;
}

/**
 * 批量操作结果接口
 */
export interface BatchResult {
    success: boolean;
    deleted?: number;
    moved?: number;
    updated?: number;
    imported?: number;
    failed: number;
    results: Array<{ id: string; success: boolean; [key: string]: any }>;
    errors: Array<{ id: string; error: string }>;
}

/**
 * 统计信息接口
 */
export interface StatsResult {
    totalNotes: number;
    totalWords: number;
    totalCharacters: number;
    byLevel: Record<string, number>;
    recentCreated: NoteMetadata[];
    recentUpdated: NoteMetadata[];
    storageSize: number;
    tags?: Record<string, number>;
}

/**
 * 历史版本接口
 */
export interface HistoryVersion {
    version: number;
    savedAt: string;
    path: string;
}

/**
 * 历史版本内容接口
 */
export interface HistoryVersionContent extends HistoryVersion {
    id: string;
    title: string;
    content: string;
}

/**
 * 导出结果接口
 */
export interface ExportResult {
    success: boolean;
    id?: string;
    title?: string;
    source?: string;
    destination: string;
    level?: string;
    count?: number;
    size?: number;
}

/**
 * 导入结果接口
 */
export interface ImportResult {
    success: boolean;
    id: string;
    title: string;
    source: string;
}

/**
 * CLI 参数接口
 */
export interface CLIArgs {
    command?: string;
    level?: string;
    title?: string;
    content?: string;
    tags?: string;
    id?: string;
    'agent-name'?: string;
    query?: string;
    tag?: string;
    sort?: string;
    order?: string;
    template?: string;
    name?: string;
    ids?: string;
    to?: string;
    'to-agent-name'?: string;
    'add-tags'?: string;
    'remove-tags'?: string;
    output?: string;
    file?: string;
    format?: string;
    version?: string;
    lineno?: string;
    column?: string;
    'case-sensitive'?: string;
    'whole-word'?: string;
    regex?: string;
    'search-in'?: string;
}