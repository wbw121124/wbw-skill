/**
 * CLI 工具模块
 * 提供彩色输出和格式化功能
 */

/**
 * 颜色枚举
 */
export enum Colors {
    Reset = '\x1b[0m',
    Bright = '\x1b[1m',
    Dim = '\x1b[2m',
    Underscore = '\x1b[4m',
    Blink = '\x1b[5m',
    Reverse = '\x1b[7m',
    Hidden = '\x1b[8m',
    
    // 前景色
    FgRed = '\x1b[31m',
    FgGreen = '\x1b[32m',
    FgYellow = '\x1b[33m',
    FgBlue = '\x1b[34m',
    FgMagenta = '\x1b[35m',
    FgCyan = '\x1b[36m',
    FgWhite = '\x1b[37m',
    
    // 背景色
    BgRed = '\x1b[41m',
    BgGreen = '\x1b[42m',
    BgYellow = '\x1b[43m',
    BgBlue = '\x1b[44m',
    BgMagenta = '\x1b[45m',
    BgCyan = '\x1b[46m',
    BgWhite = '\x1b[47m'
}

/**
 * CLI 工具类
 */
export class CliUtils {
    /**
     * 彩色输出
     */
    static colorize(text: string, color: Colors): string {
        // 如果不支持颜色，返回原始文本
        if (!process.stdout.isTTY) {
            return text;
        }
        return `${color}${text}${Colors.Reset}`;
    }

    /**
     * 成功消息
     */
    static success(message: string): string {
        return this.colorize(`✓ ${message}`, Colors.FgGreen);
    }

    /**
     * 错误消息
     */
    static error(message: string): string {
        return this.colorize(`✗ ${message}`, Colors.FgRed);
    }

    /**
     * 警告消息
     */
    static warning(message: string): string {
        return this.colorize(`⚠ ${message}`, Colors.FgYellow);
    }

    /**
     * 信息消息
     */
    static info(message: string): string {
        return this.colorize(`ℹ ${message}`, Colors.FgCyan);
    }

    /**
     * 标题
     */
    static title(message: string): string {
        return this.colorize(message, Colors.Bright);
    }

    /**
     * 格式化笔记列表
     */
    static formatNoteList(notes: Array<{ id: string; title: string; created: string; pinned?: boolean }>): string {
        if (notes.length === 0) {
            return this.warning('No notes found');
        }

        const lines: string[] = [];
        lines.push(this.title(`Found ${notes.length} note(s):`));
        lines.push('');
        
        for (const note of notes) {
            const pinned = note.pinned ? this.colorize(' 📌', Colors.FgYellow) : '';
            const date = new Date(note.created).toLocaleDateString('zh-CN');
            lines.push(`  ${this.colorize(note.id, Colors.FgCyan)} - ${note.title}${pinned} (${date})`);
        }
        
        return lines.join('\n');
    }

    /**
     * 格式化笔记内容
     */
    static formatNoteContent(note: { id: string; title: string; content: string; created: string; updated: string }): string {
        const lines: string[] = [];
        lines.push(this.title(`📝 ${note.title}`));
        lines.push(this.colorize(`ID: ${note.id}`, Colors.Dim));
        lines.push(this.colorize(`Created: ${new Date(note.created).toLocaleString('zh-CN')}`, Colors.Dim));
        lines.push(this.colorize(`Updated: ${new Date(note.updated).toLocaleString('zh-CN')}`, Colors.Dim));
        lines.push('');
        lines.push(note.content);
        
        return lines.join('\n');
    }

    /**
     * 格式化搜索结果
     */
    static formatSearchResults(results: Array<{ id: string; title: string; matchCount: number }>): string {
        if (results.length === 0) {
            return this.warning('No results found');
        }

        const lines: string[] = [];
        lines.push(this.title(`Found ${results.length} result(s):`));
        lines.push('');
        
        for (const result of results) {
            lines.push(`  ${this.colorize(result.id, Colors.FgCyan)} - ${result.title} (${result.matchCount} matches)`);
        }
        
        return lines.join('\n');
    }

    /**
     * 格式化统计信息
     */
    static formatStats(stats: { totalNotes: number; totalWords: number; totalCharacters: number; byLevel: Record<string, number> }): string {
        const lines: string[] = [];
        lines.push(this.title('📊 Statistics'));
        lines.push('');
        lines.push(`  Total Notes: ${this.colorize(stats.totalNotes.toString(), Colors.FgCyan)}`);
        lines.push(`  Total Words: ${this.colorize(stats.totalWords.toString(), Colors.FgCyan)}`);
        lines.push(`  Total Characters: ${this.colorize(stats.totalCharacters.toString(), Colors.FgCyan)}`);
        lines.push('');
        lines.push(this.title('By Level:'));
        
        for (const [level, count] of Object.entries(stats.byLevel)) {
            lines.push(`  ${level}: ${this.colorize(count.toString(), Colors.FgCyan)}`);
        }
        
        return lines.join('\n');
    }

    /**
     * 格式化错误
     */
    static formatError(error: Error): string {
        return this.error(error.message);
    }

    /**
     * 显示帮助信息
     */
    static showHelp(): string {
        const lines: string[] = [];
        lines.push(this.title('WBW Skill - LLM Notepad System'));
        lines.push('');
        lines.push(this.title('Commands:'));
        lines.push('  create    Create a new note');
        lines.push('  list      List notes');
        lines.push('  read      Read a note');
        lines.push('  update    Update a note');
        lines.push('  delete    Delete a note');
        lines.push('  pin       Toggle pin status');
        lines.push('  search    Search notes');
        lines.push('  tags      List all tags');
        lines.push('  templates List templates');
        lines.push('  stats     Show statistics');
        lines.push('');
        lines.push(this.title('Options:'));
        lines.push('  --level   Storage level (global|workspace|agent)');
        lines.push('  --title   Note title');
        lines.push('  --content Note content');
        lines.push('  --tags    Comma-separated tags');
        lines.push('  --id      Note ID');
        lines.push('  --query   Search query');
        lines.push('');
        lines.push(this.title('Examples:'));
        lines.push('  wbw-notes create --title "My Note" --content "Hello"');
        lines.push('  wbw-notes list --level workspace');
        lines.push('  wbw-notes search --query "keyword"');
        
        return lines.join('\n');
    }
}
