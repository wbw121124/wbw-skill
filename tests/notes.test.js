/**
 * NotesManager 测试
 */

const NotesManager = require('../notes');

describe('NotesManager', () => {
    let manager;

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
            const result = manager.createNote('workspace', 'Test Note', 'Test content', null, ['tag1', 'tag2']);
            expect(result.tags).toEqual(['tag1', 'tag2']);
        });

        it('should create a note with template', () => {
            const result = manager.createNote('workspace', 'Test Meeting', '', null, [], 'meeting');
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
            
            const result = manager.listNotes('workspace', null, { sort: 'title', order: 'asc' });
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
            const created = manager.createNote('workspace', 'Test Note', 'Content', null, ['old-tag']);
            const updated = manager.updateNote('workspace', created.id, 'Content', null, ['new-tag']);
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
        it('should search notes by keyword', () => {
            manager.createNote('workspace', 'Meeting Notes', 'Discussed project timeline');
            manager.createNote('workspace', 'Todo List', 'Buy groceries');
            
            const results = manager.searchNotes('project');
            expect(results.length).toBeGreaterThanOrEqual(1);
        });

        it('should search with options', () => {
            manager.createNote('workspace', 'API Design', 'REST API guidelines');
            
            const results = manager.searchNotes('API', 'workspace', null, { caseSensitive: true });
            expect(results.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('listTags', () => {
        it('should list all tags', () => {
            manager.createNote('workspace', 'Note 1', 'Content', null, ['tag1', 'tag2']);
            manager.createNote('workspace', 'Note 2', 'Content', null, ['tag2', 'tag3']);
            
            const result = manager.listTags('workspace');
            expect(Object.keys(result)).toContain('tag1');
            expect(Object.keys(result)).toContain('tag2');
            expect(Object.keys(result)).toContain('tag3');
        });
    });

    describe('listNotesByTag', () => {
        it('should list notes by tag', () => {
            manager.createNote('workspace', 'Note 1', 'Content', null, ['important']);
            manager.createNote('workspace', 'Note 2', 'Content', null, ['normal']);
            
            const result = manager.listNotesByTag('important', 'workspace');
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0].tags).toContain('important');
        });
    });

    describe('batchDelete', () => {
        it('should batch delete notes', () => {
            const note1 = manager.createNote('workspace', 'Note 1', 'Content');
            const note2 = manager.createNote('workspace', 'Note 2', 'Content');
            
            const result = manager.batchDelete([note1.id, note2.id], 'workspace');
            expect(result.success).toBe(true);
            expect(result.deleted).toBe(2);
        });
    });

    describe('exportNote', () => {
        it('should export a note', () => {
            const created = manager.createNote('workspace', 'Export Test', 'Content');
            const result = manager.exportNote('workspace', created.id, './test-exports');
            expect(result.success).toBe(true);
        });
    });

    describe('importNoteFromMarkdown', () => {
        it('should import a note from markdown', () => {
            const result = manager.importNoteFromMarkdown('./test-import.md', 'workspace');
            expect(result).toHaveProperty('success');
        });
    });

    describe('getStats', () => {
        it('should get statistics', () => {
            manager.createNote('workspace', 'Stats Note 1', 'Content one');
            manager.createNote('workspace', 'Stats Note 2', 'Content two');
            
            const stats = manager.getStats('workspace');
            expect(stats.totalNotes).toBeGreaterThanOrEqual(2);
            expect(stats.totalWords).toBeGreaterThan(0);
        });
    });
});