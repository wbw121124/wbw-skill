---
name: wbw-skill
description: A notepad/memo system for LLMs with global, workspace, and agent-level storage. Use when the user wants to create, read, update, delete, or search notes/memos. Use ONLY for note-taking tasks.
---

# WBW Skill - LLM Notepad/Memo System

This skill provides a notepad/memo system for LLMs with three storage levels:
- **Global**: Shared across all projects and agents
- **Workspace**: Specific to the current project/workspace
- **Agent**: Specific to the current agent

## Tool: notes

A unified tool for managing notes with the following parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Action: create, list, read, update, delete, search, list_by_tag, list_tags, list_templates, get_template, batch_delete, batch_move, batch_add_tags, batch_remove_tags, export, import |
| `level` | string | No | Storage level: global, workspace, agent (default: workspace) |
| `title` | string | For create | Note title |
| `content` | string | For create/update | Note content |
| `tags` | array | No | Tags for the note (for create/update) |
| `template` | string | No | Template name: meeting, todo, daily, idea, bug, feature (for create) |
| `id` | string | For read/update/delete | Note ID |
| `agentName` | string | For agent level | Agent name |
| `query` | string | For search | Search keyword |
| `tag` | string | For list_by_tag | Tag to filter by |
| `templateName` | string | For get_template | Template name to retrieve |
| `sort` | string | No | Sort field: created, updated, title, id (default: created) |
| `order` | string | No | Sort order: asc, desc (default: desc) |
| `ids` | array | For batch ops | Array of note IDs for batch operations |
| `toLevel` | string | For batch_move | Target storage level |
| `toAgentName` | string | For batch_move | Target agent name |
| `addTags` | array | For batch_add_tags | Tags to add to notes |
| `removeTags` | array | For batch_remove_tags | Tags to remove from notes |
| `outputPath` | string | For export | Output file/directory path |
| `filePath` | string | For import | File path to import (.md, .json, .zip) |
| `format` | string | No | Export format: md, json (default: md) |
| `searchIn` | string | No | Search scope: all, title, content (default: all) |
| `caseSensitive` | boolean | No | Case-sensitive search (default: false) |
| `wholeWord` | boolean | No | Whole word match (default: false) |
| `regex` | boolean | No | Use regex pattern (default: false) |

## Usage Examples

### 1. Create a Global Note
```json
{
  "action": "create",
  "level": "global",
  "title": "My Global Note",
  "content": "This is a global note shared across all projects.",
  "tags": ["important", "reference"]
}
```

### 2. List Workspace Notes
```json
{
  "action": "list",
  "level": "workspace"
}
```

### 3. List Notes Sorted by Updated Time
```json
{
  "action": "list",
  "level": "workspace",
  "sort": "updated",
  "order": "desc"
}
```

### 4. List Notes Sorted by Title (Ascending)
```json
{
  "action": "list",
  "level": "workspace",
  "sort": "title",
  "order": "asc"
}
```

### 5. Read an Agent-Specific Note
```json
{
  "action": "read",
  "level": "agent",
  "id": "note-1234567890-abc123",
  "agentName": "code-reviewer"
}
```

### 4. Update a Note
```json
{
  "action": "update",
  "level": "workspace",
  "id": "note-1234567890-abc123",
  "content": "Updated content here..."
}
```

### 5. Delete a Note
```json
{
  "action": "delete",
  "level": "global",
  "id": "note-1234567890-abc123"
}
```

### 6. Search Notes
```json
{
  "action": "search",
  "query": "important",
  "searchIn": "all"
}
```

### 7. Search with Options
```json
{
  "action": "search",
  "query": "TODO",
  "level": "workspace",
  "searchIn": "content",
  "caseSensitive": true,
  "wholeWord": true
}
```

### 8. Search with Regex
```json
{
  "action": "search",
  "query": "\\berror\\b|\\bwarning\\b",
  "regex": true,
  "searchIn": "content"
}
```

## Storage Locations

- **Global**: `~/.wbw-skill/notes/global/`
- **Workspace**: `.wbw-skill/notes/workspace/` (in current project root)
- **Agent**: `.wbw-skill/notes/agent/<agent-name>/`

## Note Format

Each note is stored as a Markdown file with YAML frontmatter:
```markdown
---
id: "unique-id"
title: "Note Title"
created: "2026-09-05T12:00:00Z"
updated: "2026-09-05T12:00:00Z"
level: "global|workspace|agent"
tags: [tag1, tag2]
---

Note content here...
```

## Jump Syntax

The skill supports custom jump syntax for linking between notes:

```
[@jumpto level,agent,id:lineno:column]
```

| Part | Description | Required |
|------|-------------|----------|
| `level` | Target level: global, workspace, agent | Yes |
| `agent` | Agent name (for agent level) | No |
| `id` | Target note ID | Yes |
| `lineno` | Target line number | No |
| `column` | Target column number | No |

### Examples

```markdown
See [@jumpto global,,note-123] for more details.

Jump to line 10: [@jumpto workspace,,note-456:10]

Jump to specific position: [@jumpto agent,my-agent,note-789:15:5]
```

### Parse Jumps Tool

Use `parse_jumps` to extract all jump targets from content:

```json
{
  "tool": "parse_jumps",
  "arguments": {
    "content": "See [@jumpto global,,note-123] for details."
  }
}
```

### JumpTo Tool

Use `jumpto` to navigate to a specific location:

```json
{
  "tool": "jumpto",
  "arguments": {
    "level": "global",
    "id": "note-123",
    "lineno": 10,
    "column": 5
  }
}
```

## Search Examples

### Basic Search
```json
{
  "action": "search",
  "query": "hello"
}
```

### Title-only Search
```json
{
  "action": "search",
  "query": "meeting",
  "searchIn": "title"
}
```

### Content-only Search
```json
{
  "action": "search",
  "query": "implementation",
  "searchIn": "content"
}
```

### Case-Sensitive Search
```json
{
  "action": "search",
  "query": "API",
  "caseSensitive": true
}
```

### Whole Word Search
```json
{
  "action": "search",
  "query": "test",
  "wholeWord": true
}
```

### Regex Search
```json
{
  "action": "search",
  "query": "note-\\d{4}",
  "regex": true
}
```

## Tag Examples

### Create Note with Tags
```json
{
  "action": "create",
  "level": "workspace",
  "title": "Meeting Notes",
  "content": "Discussed project timeline...",
  "tags": ["meeting", "project-x"]
}
```

### List Notes by Tag
```json
{
  "action": "list_by_tag",
  "tag": "meeting"
}
```

### List All Tags
```json
{
  "action": "list_tags"
}
```

### Update Note Tags
```json
{
  "action": "update",
  "level": "workspace",
  "id": "note-123",
  "content": "Updated content...",
  "tags": ["meeting", "project-x", "updated"]
}
```

## Template Examples

### List Available Templates
```json
{
  "action": "list_templates"
}
```

### Get Template Content
```json
{
  "action": "get_template",
  "templateName": "meeting"
}
```

### Create Note with Template
```json
{
  "action": "create",
  "level": "workspace",
  "title": "Weekly Team Meeting",
  "template": "meeting",
  "tags": ["meeting", "weekly"]
}
```

### Create Note with Template and Additional Content
```json
{
  "action": "create",
  "level": "workspace",
  "title": "Bug Report - Login Issue",
  "content": "Users are unable to login after password reset.",
  "template": "bug",
  "tags": ["bug", "urgent"]
}
```

### Available Templates

| Template | Description |
|----------|-------------|
| `meeting` | Meeting notes template |
| `todo` | Todo list template |
| `daily` | Daily journal/log template |
| `idea` | Idea/inspiration template |
| `bug` | Bug report template |
| `feature` | Feature request template |

## Batch Operation Examples

### Batch Delete Notes
```json
{
  "action": "batch_delete",
  "level": "workspace",
  "ids": ["note-123", "note-456", "note-789"]
}
```

### Batch Move Notes
```json
{
  "action": "batch_move",
  "level": "workspace",
  "toLevel": "global",
  "ids": ["note-123", "note-456"]
}
```

### Batch Add Tags
```json
{
  "action": "batch_add_tags",
  "level": "workspace",
  "ids": ["note-123", "note-456"],
  "addTags": ["important", "reference"]
}
```

### Batch Remove Tags
```json
{
  "action": "batch_remove_tags",
  "level": "workspace",
  "ids": ["note-123", "note-456"],
  "removeTags": ["draft"]
}
```

## Import/Export Examples

### Export Note as Markdown
```json
{
  "action": "export",
  "level": "workspace",
  "id": "note-123",
  "outputPath": "./exports/",
  "format": "md"
}
```

### Export Note as JSON
```json
{
  "action": "export",
  "level": "workspace",
  "id": "note-123",
  "outputPath": "./exports/",
  "format": "json"
}
```

### Import Note from Markdown
```json
{
  "action": "import",
  "level": "workspace",
  "filePath": "./imports/note.md"
}
```

### Import Note from JSON
```json
{
  "action": "import",
  "level": "workspace",
  "filePath": "./imports/note.json"
}
```

## CLI Alternative

You can also use the CLI script directly:
```bash
# Create note
node notes.js create --level global --title "My Note" --content "Content" --tags "important,reference"

# List notes
node notes.js list --level workspace

# Read note
node notes.js read --level agent --id "note-123" --agent-name "my-agent"

# Update note
node notes.js update --level workspace --id "note-123" --content "New content" --tags "tag1,tag2"

# Delete note
node notes.js delete --level global --id "note-123"

# Search notes
node notes.js search --query "keyword"
node notes.js search --query "keyword" --level workspace --search-in title
node notes.js search --query "keyword" --case-sensitive true --whole-word true
node notes.js search --query "pattern" --regex true

# List notes by tag
node notes.js list-by-tag --tag "important"

# List all tags
node notes.js list-tags

# Parse jump syntax
node notes.js parse-jumps --content "[@jumpto global,,note-123:10]"

# Jump to location
node notes.js jumpto --level global --id "note-123" --lineno 10 --column 5
```