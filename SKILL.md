---
name: wbw-skill
description: A notepad/memo system for LLMs with global, workspace, and agent-level storage. Use when the user wants to create, read, update, or delete notes/memos. Use ONLY for note-taking tasks.
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
| `action` | string | Yes | Action: create, list, read, update, delete |
| `level` | string | No | Storage level: global, workspace, agent (default: workspace) |
| `title` | string | For create | Note title |
| `content` | string | For create/update | Note content |
| `id` | string | For read/update/delete | Note ID |
| `agentName` | string | For agent level | Agent name |

## Usage Examples

### 1. Create a Global Note
```json
{
  "action": "create",
  "level": "global",
  "title": "My Global Note",
  "content": "This is a global note shared across all projects."
}
```

### 2. List Workspace Notes
```json
{
  "action": "list",
  "level": "workspace"
}
```

### 3. Read an Agent-Specific Note
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

## CLI Alternative

You can also use the CLI script directly:
```bash
node notes.js create --level global --title "My Note" --content "Content"
node notes.js list --level workspace
node notes.js read --level agent --id "note-123" --agent-name "my-agent"
node notes.js update --level workspace --id "note-123" --content "New content"
node notes.js delete --level global --id "note-123"
```