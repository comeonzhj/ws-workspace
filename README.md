# WS Workspace

**[中文](./README.zh-CN.md)** | English

> From Markdown to HTML: a collaborative workspace where AI agents and humans share a living, interactive page.

Inspired by [Thariq's "The Unreasonable Effectiveness of HTML"](https://x.com/trq212/status/2052809885763747935) — the idea that HTML is a far richer medium than Markdown for agent-human communication. WS Workspace takes this further: instead of agents *outputting* HTML, they **maintain an interactive workspace** that humans operate directly. The result is a two-way collaboration loop.

```
Agent ──CLI──▶ HTML Workspace ──interaction──▶ Human
  ▲                                              │
  └────────WebSocket state──────────────────────┘
```

## Quick Start

```bash
npx ws-workspace start
```

Open `http://localhost:1989` in your browser. The workspace starts empty — an agent (or you via CLI) adds components.

```bash
# In another terminal, add components:
npx ws-workspace add kanban '{"columns":["Ideas","Evaluating","Confirmed","In Progress"]}'
npx ws-workspace add decision-card '{"question":"Which direction?","options":[{"value":"a","label":"Option A"},{"value":"b","label":"Option B"}]}'
npx ws-workspace add todo-list '{"title":"Action Items","items":["Research","Prototype","Ship"]}'
```

The page updates in real-time via WebSocket. Users drag cards, click options, check boxes — all state flows back as structured JSON.

## Install (Global)

```bash
npm install -g ws-workspace
ws-workspace start
```

## CLI Commands

| Command | Description |
|---|---|
| `ws-workspace start [--port PORT]` | Start the workspace server (default: 1989) |
| `ws-workspace init [name]` | Create a workspace config file |
| `ws-workspace add <type> [json-config]` | Add a component to the workspace |
| `ws-workspace state [component-id]` | Get full state or a single component |
| `ws-workspace update <id> [json-config] [json-state]` | Update a component's config or state |
| `ws-workspace delete <id>` | Remove a component |
| `ws-workspace title <text>` | Set the workspace title |
| `ws-workspace events [--since=ts] [--component=id]` | Get user interaction events |
| `ws-workspace reset` | Reset workspace to empty state |

## Component Types

| Type | What it does | User interaction |
|---|---|---|
| `heading` | Title + subtitle | Display only |
| `kanban` | Multi-column board | Drag cards between columns, add cards |
| `decision-card` | Single-select question with optional comment | Click to select, type comment |
| `todo-list` | Checklist | Toggle items, add new items |
| `form` | Structured input fields | Fill in fields, submit |
| `table` | Data table | View data |
| `rich-editor` | Content-editable text area | Free-form writing |

### Component Examples

```bash
# Kanban with custom columns
ws-workspace add kanban '{"title":"Feature Priorities","columns":["Backlog","Next","Now","Done"]}'

# Decision card with descriptions
ws-workspace add decision-card '{"title":"Pick a direction","question":"Which approach?","options":[{"value":"fast","label":"Ship fast","description":"MVP in 1 week"},{"value":"complete","label":"Ship complete","description":"Full feature in 3 weeks"}]}'

# Form with mixed field types
ws-workspace add form '{"title":"Config","fields":[{"name":"name","label":"Project Name","type":"text"},{"name":"priority","label":"Priority","type":"select","options":["P0","P1","P2"]},{"name":"notes","label":"Notes","type":"textarea"}]}'

# Table with data
ws-workspace add table '{"title":"Team","headers":["Name","Role","Status"],"rows":[["Alice","PM","Active"],["Bob","Dev","Active"],["Carol","Design","On leave"]]}'

# Rich editor for free-form input
ws-workspace add rich-editor '{"title":"Meeting Notes","placeholder":"Write your thoughts..."}'

# Todo list with initial items
ws-workspace add todo-list '{"title":"Launch Checklist","items":["Code review","QA testing","Deploy to prod","Announce"]}'
```

## REST API

All endpoints are at `http://localhost:1989/api/`:

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `GET` | `/api/state` | — | Full workspace state (components + events) |
| `GET` | `/api/state?component=<id>` | — | Single component state |
| `GET` | `/api/events?since=<ts>&component=<id>` | — | User action events |
| `POST` | `/api/components` | `{type, config}` | Add a component |
| `PUT` | `/api/components/:id` | `{config?, state?}` | Update component |
| `DELETE` | `/api/components/:id` | — | Remove component |
| `PUT` | `/api/title` | `{title}` | Set workspace title |
| `POST` | `/api/reset` | — | Reset everything |

### State Response Format

```json
{
  "title": "My Workspace",
  "components": [
    {
      "id": "kanban-a1b2c3d4",
      "type": "kanban",
      "config": { "title": "Priorities", "columns": ["Todo", "Done"] },
      "state": { "Todo": ["Feature A", "Feature B"], "Done": ["Feature C"] }
    }
  ],
  "events": [
    {
      "id": "evt-1234",
      "component_id": "decision-card-xyz",
      "event": "user_choice",
      "data": { "selected": "option-a", "comment": "Faster is better" },
      "ts": 1715400000000
    }
  ]
}
```

## For Agents

If you're an AI agent reading this repo — here's how to get up and running:

### Install

```bash
npm install -g ws-workspace
```

Or run directly:

```bash
npx ws-workspace start --port 1989
```

### Workflow

1. **Start the server**: `ws-workspace start` (or `npx ws-workspace start`)
2. **Tell the human** the URL (e.g., `http://localhost:1989`)
3. **Add components** via CLI as you work:
   - Use `heading` to section the workspace
   - Use `kanban` for sorting, prioritizing, status tracking
   - Use `decision-card` when you need the human to pick a direction
   - Use `form` to collect structured input
   - Use `todo-list` for checklists and action items
   - Use `table` for comparison matrices
   - Use `rich-editor` for free-form human writing
4. **Read state** via `ws-workspace state` to see all components and their current state
5. **Read events** via `ws-workspace events` to see what the human has done (choices made, cards dragged, forms submitted)
6. **Update components** as the work evolves

### Tips

- Each `add` command returns the component's JSON with its `id`. Save this — you'll need it for `update` and `delete`.
- The `events` endpoint is your "ear" — check it after giving the human something to interact with. It contains structured data, not natural language.
- For decision cards, the human's selection appears in `state.selected` and any comment in `state.comment`.
- For kanban, cards can be dragged between columns. The `state` object reflects current column contents.
- You can run multiple workspaces on different ports: `ws-workspace start --port 3001`

### Example Agent Session

```bash
# Agent starts workspace
ws-workspace start --port 1989

# Agent adds a heading
ws-workspace add heading '{"text":"Sprint Planning","level":1,"subtitle":"Let\\'s figure out what to ship this week."}'

# Agent adds a kanban for prioritization
ws-workspace add kanban '{"title":"This Week","columns":["Candidates","Top Picks","Committed","Shipped"]}'

# Agent pre-populates kanban
ws-workspace update kanban-a1b2c3d4 '{}' '{"candidates":["Auth redesign","API v2","Dark mode","Mobile app"],"top-picks":[],"committed":[],"shipped":[]}'

# Agent adds a decision card
ws-workspace add decision-card '{"question":"Which feature matters most right now?","options":[{"value":"auth","label":"Auth redesign","description":"Security & compliance"},{"value":"api","label":"API v2","description":"Developer experience"},{"value":"dark","label":"Dark mode","description":"User delight"}]}'

# Agent waits, then reads what the human chose
ws-workspace state decision-card-xyz
# → { "selected": "api", "comment": "DevEx is our bottleneck" }

# Agent continues work based on the choice...
```

## MCP Server

WS Workspace ships with a built-in [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server for AI agents that support the MCP tool protocol (Claude Desktop, Cursor, Windsurf, etc.).

### MCP Configuration

Add to your MCP client config:

```json
{
  "mcpServers": {
    "ws-workspace": {
      "command": "npx",
      "args": ["-y", "ws-workspace", "mcp"]
    }
  }
}
```

Or if globally installed:

```json
{
  "mcpServers": {
    "ws-workspace": {
      "command": "ws-workspace",
      "args": ["mcp"]
    }
  }
}
```

> **Note:** The MCP server connects to a running workspace. Start it first with `ws-workspace start`.

### Available MCP Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `workspace_add` | Add a component | `type`, `config` |
| `workspace_state` | Read state | `component_id` (optional) |
| `workspace_update` | Update a component | `component_id`, `config`, `state` |
| `workspace_delete` | Remove a component | `component_id` |
| `workspace_events` | Read user events | `since`, `component_id` |
| `workspace_title` | Set workspace title | `title` |
| `workspace_reset` | Reset workspace | — |
| `workspace_wait` | Wait for user interaction | `component_id`, `timeout` |

## Skill

The `skills/ws-workspace.md` file is an AI agent skill that can be installed into any compatible agent framework (Hermes, Cursor rules, CLAUDE.md, etc.). It provides:

- Complete component reference
- Workflow guidance for agents
- Decision tree for choosing the right component
- State reading patterns
- MCP configuration

Copy `skills/ws-workspace.md` into your agent's skill directory, or reference it directly from the repo.

## Architecture

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Browser    │ ◄──────────────► │   Server     │
│  (HTML UI)   │   live updates    │  (Express +  │
│              │   + user events   │   WebSocket) │
└─────────────┘                    └──────┬──────┘
                                          │ REST API
                                   ┌──────▼──────┐
                                   │  Agent/CLI   │
                                   │  (ws-workspace│
                                   │   commands)  │
                                   └─────────────┘
```

- **Server** (`server.js`): Express serves the HTML workspace, WebSocket pushes state to browsers, REST API accepts agent commands
- **Frontend** (`public/index.html`): Single HTML file with inline Web Components, warm light theme
- **CLI** (`bin/ws-workspace.js`): Agent-facing command interface, translates commands to REST calls
- **About** (`public/about.html`): Landing page explaining the paradigm

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `1989` | Server listen port |
| `WS_URL` | `http://localhost:1989` | Server URL for CLI |

## Acknowledgments

This project was inspired by Thariq Mallik's ["The Unreasonable Effectiveness of HTML"](https://x.com/trq212/status/2052809885763747935) (May 2026), which argued that HTML is a far superior medium to Markdown for agent-to-human communication. WS Workspace extends this idea into a bidirectional collaboration protocol.

## License

MIT © [comeonzhj](https://github.com/comeonzhj)
