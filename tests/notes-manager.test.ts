/**
 * NotesManager 测试
 */

import { NotesManager } from '../src/core/notes-manager';

describe('NotesManager', () => {
    let manager: NotesManager;

    beforeEach(() => {
        manager = new NotesManager();
    });

    describe('createNote', () => {
        it('should create a note with basic info', () => {
            const result = manager.createNote('workspace', 'Test Note', 'Test content');
            expect(result).toHaveProperty('id');
            expect(result.title).toBe('Test Note');
            expect(result.level).toBe('workspace');
        });

        it('should create a note with tags', () => {
            const result = manager.createNote('workspace', 'Test Note', 'Test content', undefined, ['tag1', 'tag2']);
            expect(result.tags).toEqual(['tag1', 'tag2']);
        });

        it('should create a note with template', () => {
            const result = manager.createNote('workspace', 'Test Meeting', '', undefined, [], 'meeting');
            expect(result).toHaveProperty('id');
            expect(result.title).toBe('Test Meeting');
        });
    });

    describe('listNotes', () => {
        it('should list notes', () => {
            manager.createNote('workspace', 'Note 1', 'Content 1');
            manager.createNote('workspace', 'Note 2', 'Content 2');
            
            const result = manager.listNotes('workspace');
            expect(result.notes.length).toBeGreaterThanOrEqual(2);
        });

        it('should list notes with sort options', () => {
            manager.createNote('workspace', 'Note A', 'Content A');
            manager.createNote('workspace', 'Note B', 'Content B');
            
            const result = manager.listNotes('workspace', undefined, { sort: 'title', order: 'asc' });
            expect(result.notes.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('readNote', () => {
        it('should read a note by id', () => {
            const created = manager.createNote('workspace', 'Test Note', 'Test content');
            const note = manager.readNote('workspace', created.id);
            expect(note.id).toBe(created.id);
            expect(note.content).toBe('Test content');
        });

        it('should throw error for non-existent note', () => {
            expect(() => manager.readNote('workspace', 'non-existent')).toThrow();
        });
    });

    describe('updateNote', () => {
        it('should update a note', () => {
            const created = manager.createNote('workspace', 'Test Note', 'Old content');
            const updated = manager.updateNote('workspace', created.id, 'New content');
            expect(updated.success).toBe(true);
        });

        it('should update tags', () => {
            const created = manager.createNote('workspace', 'Test Note', 'Content', undefined, ['old-tag']);
            const updated = manager.updateNote('workspace', created.id, 'Content', undefined, ['new-tag']);
            expect(updated.tags).toEqual(['new-tag']);
        });
    });

    describe('deleteNote', () => {
        it('should delete a note', () => {
            const created = manager.createNote('workspace', 'Test Note', 'Content');
            const result = manager.deleteNote('workspace', created.id);
            expect(result.success).toBe(true);
        });
    });

    describe('listTemplates', () => {
        it('should list available templates', () => {
            const result = manager.listTemplates();
            expect(result.templates.length).toBeGreaterThan(0);
            expect(result.templates.some(t => t.name === 'meeting')).toBe(true);
            expect(result.templates.some(t => t.name === 'todo')).toBe(true);
        });
    });

    describe('getTemplate', () => {
        it('should get template by name', () => {
            const result = manager.getTemplate('meeting');
            expect(result.name).toBe('meeting');
            expect(result.content).toContain('会议记录');
        });

        it('should throw error for non-existent template', () => {
            expect(() => manager.getTemplate('non-existent')).toThrow();
        });
    });

    describe('searchNotes', () => {
        it('should search notes by query', () => {
            manager.createNote('workspace', 'Test Note', 'Test content');
            const results = manager.searchNotes('Test');
            expect(results.length).toBeGreaterThanOrEqual(1);
        });

        it('should return empty for no matches', () => {
            const results = manager.searchNotes('xyznonexistent');
            expect(results.length).toBe(0);
        });
    });

    describe('getStats', () => {
        it('should return stats', () => {
            manager.createNote('workspace', 'Test Note', 'Test content');
            const stats = manager.getStats();
            expect(stats).toHaveProperty('totalNotes');
            expect(stats.totalNotes).toBeGreaterThanOrEqual(1);
        });
    });

    describe('listTags', () => {
        it('should list tags', () => {
            manager.createNote('workspace', 'Test Note', 'Content', undefined, ['test-tag']);
            const tags = manager.listTags();
            expect(tags).toHaveProperty('test-tag');
        });
    });
});
