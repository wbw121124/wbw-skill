/**
 * 安全工具模块
 * 提供输入验证和数据清理功能
 */

import * as path from 'path';

/**
 * 安全工具类
 */
export class SecurityUtils {
    /**
     * 验证笔记 ID 格式
     * 防止路径遍历攻击
     */
    static validateNoteId(id: string): boolean {
        // ID 只能包含字母、数字、连字符和下划线
        const validIdPattern = /^[a-zA-Z0-9_-]+$/;
        return validIdPattern.test(id) && !id.includes('..');
    }

    /**
     * 清理文件名
     * 移除或替换不安全的字符
     */
    static sanitizeFilename(filename: string): string {
        // 移除或替换不安全的字符
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')  // 替换 Windows 不安全字符
            .replace(/\.\./g, '_')           // 防止路径遍历
            .replace(/^\./, '_')             // 防止隐藏文件
            .trim();
    }

    /**
     * 验证存储级别
     */
    static validateLevel(level: string): boolean {
        const validLevels = ['global', 'workspace', 'agent'];
        return validLevels.includes(level);
    }

    /**
     * 验证路径是否安全
     * 防止路径遍历攻击
     */
    static isPathSafe(basePath: string, targetPath: string): boolean {
        const resolvedBase = path.resolve(basePath);
        const resolvedTarget = path.resolve(targetPath);
        return resolvedTarget.startsWith(resolvedBase);
    }

    /**
     * 转义 Markdown 中的特殊字符
     * 防止 XSS 攻击
     */
    static escapeMarkdown(content: string): string {
        return content
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }

    /**
     * 清理用户输入
     * 移除潜在的危险字符
     */
    static sanitizeInput(input: string): string {
        if (typeof input !== 'string') {
            return '';
        }
        
        return input
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 移除控制字符
            .trim();
    }

    /**
     * 验证标签格式
     */
    static validateTag(tag: string): boolean {
        // 标签只能包含字母、数字、连字符、下划线和中文
        const validTagPattern = /^[a-zA-Z0-9_\u4e00-\u9fa5-]+$/;
        return validTagPattern.test(tag) && tag.length > 0 && tag.length <= 50;
    }

    /**
     * 验证模板名称
     */
    static validateTemplateName(name: string): boolean {
        const validTemplatePattern = /^[a-zA-Z0-9_]+$/;
        return validTemplatePattern.test(name);
    }
}
