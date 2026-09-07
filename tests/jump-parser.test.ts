/**
 * JumpParser 测试
 */

import { JumpParser } from '../src/core/jump-parser';

describe('JumpParser', () => {
    describe('parse', () => {
        it('should parse jump syntax', () => {
            const content = '[@jumpto workspace,note-123]';
            const jumps = JumpParser.parse(content);
            expect(jumps.length).toBe(1);
            expect(jumps[0].level).toBe('workspace');
            expect(jumps[0].id).toBe('note-123');
        });

        it('should parse jump with line and column', () => {
            const content = '[@jumpto workspace,agent1,note-123:10:5]';
            const jumps = JumpParser.parse(content);
            expect(jumps.length).toBe(1);
            expect(jumps[0].level).toBe('workspace');
            expect(jumps[0].agent).toBe('agent1');
            expect(jumps[0].id).toBe('note-123');
            expect(jumps[0].lineno).toBe(10);
            expect(jumps[0].column).toBe(5);
        });

        it('should return empty for no jumps', () => {
            const content = 'No jumps here';
            const jumps = JumpParser.parse(content);
            expect(jumps.length).toBe(0);
        });

        it('should parse multiple jumps', () => {
            const content = '[@jumpto workspace,note-1]\n[@jumpto global,note-2]';
            const jumps = JumpParser.parse(content);
            expect(jumps.length).toBe(2);
        });
    });

    describe('toDescription', () => {
        it('should convert to description', () => {
            const jump = {
                fullMatch: '[@jumpto workspace,note-123]',
                level: 'workspace' as any,
                agent: null,
                id: 'note-123',
                lineno: null,
                column: null
            };
            const desc = JumpParser.toDescription(jump);
            expect(desc).toBe('→ workspace/note-123');
        });

        it('should include agent in description', () => {
            const jump = {
                fullMatch: '[@jumpto workspace,agent1,note-123]',
                level: 'workspace' as any,
                agent: 'agent1',
                id: 'note-123',
                lineno: null,
                column: null
            };
            const desc = JumpParser.toDescription(jump);
            expect(desc).toBe('→ workspace/agent1/note-123');
        });

        it('should include line and column', () => {
            const jump = {
                fullMatch: '[@jumpto workspace,note-123:10:5]',
                level: 'workspace' as any,
                agent: null,
                id: 'note-123',
                lineno: 10,
                column: 5
            };
            const desc = JumpParser.toDescription(jump);
            expect(desc).toBe('→ workspace/note-123:10:5');
        });
    });

    describe('toTarget', () => {
        it('should convert to target', () => {
            const jump = {
                fullMatch: '[@jumpto workspace,note-123]',
                level: 'workspace' as any,
                agent: null,
                id: 'note-123',
                lineno: null,
                column: null
            };
            const target = JumpParser.toTarget(jump);
            expect(target.level).toBe('workspace');
            expect(target.id).toBe('note-123');
            expect(target.lineno).toBe(1);
            expect(target.column).toBe(1);
        });
    });
});
