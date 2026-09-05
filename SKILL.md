---
name: wbw-skill
description: A notepad/memo system for LLMs with global, workspace, and agent-level storage. Use when the user wants to create, read, update, or delete notes/memos. Use ONLY for note-taking tasks.
---

# WBW Skill - LLM Notepad/Memo System

This skill provides a notepad/memo system for LLMs with three storage levels:
- **Global**: Shared across all projects and agents
- **Workspace**: Specific to the current project/workspace
- **Agent**: Specific to the current agent

## Tools

### 1. Create Note
```bash
node notes.js create --level <global|workspace|agent> --title "<title>" --content "<content>" [--agent-name "<agent-name>"]
```

### 2. List Notes
```bash
node notes.js list --level <global|workspace|agent> [--agent-name "<agent-name>"]
```

### 3. Read Note
```bash
node notes.js read --level <global|workspace|agent> --id "<note-id>" [--agent-name "<agent-name>"]
```

### 4. Update Note
```bash
node notes.js update --level <global|workspace|agent> --id "<note-id>" --content "<content>" [--agent-name "<agent-name>"]
```

### 5. Delete Note
```bash
node notes.js delete --level <global|workspace|agent> --id "<note-id>" [--agent-name "<agent-name>"]
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

## Usage Examples

1. Create a global note:
   ```bash
   node notes.js create --level global --title "My Global Note" --content "This is a global note."
   ```

2. List workspace notes:
   ```bash
   node notes.js list --level workspace
   ```

3. Read an agent-specific note:
   ```bash
   node notes.js read --level agent --id "note-123" --agent-name "my-agent"
   ```

## Implementation Notes

- The `notes.js` script handles all note operations
- Notes are stored as individual Markdown files
- Each note has a unique ID (timestamp-based)
- The script automatically creates necessary directories
- Agent-level notes require `--agent-name` parameter