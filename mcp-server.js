#!/usr/bin/env node

/**
 * ws-workspace MCP Server
 *
 * Exposes workspace operations as MCP tools for AI agents.
 * Communicates via stdio using JSON-RPC 2.0.
 *
 * Usage:
 *   node mcp-server.js                    # start MCP server (default port 1989)
 *   WS_PORT=3000 node mcp-server.js       # custom port
 */

const http = require('http');

const PORT = process.env.WS_PORT || 1989;
const BASE = process.env.WS_URL || `http://localhost:${PORT}`;

// ─── HTTP client ────────────────────────────────────────
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        reject(new Error(`Cannot connect to workspace server at ${BASE}. Start it with: ws-workspace start`));
      } else {
        reject(e);
      }
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Tool definitions ───────────────────────────────────
const TOOLS = [
  {
    name: 'workspace_add',
    description: 'Add a component to the workspace. Available types: heading, kanban, decision-card, todo-list, form, table, rich-editor. Returns the created component with its id.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['heading', 'kanban', 'decision-card', 'todo-list', 'form', 'table', 'rich-editor'],
          description: 'Component type'
        },
        config: {
          type: 'object',
          description: 'Component configuration (type-specific). Examples: kanban: {title, columns}, decision-card: {question, options}, todo-list: {title, items}, form: {title, fields}, table: {title, headers, rows}, heading: {text, level, subtitle}, rich-editor: {title, placeholder}'
        }
      },
      required: ['type']
    }
  },
  {
    name: 'workspace_state',
    description: 'Get the current state of the workspace or a specific component. Without component_id returns all components and events. With component_id returns that component\'s config and state.',
    inputSchema: {
      type: 'object',
      properties: {
        component_id: {
          type: 'string',
          description: 'Optional component ID to get state for a single component'
        }
      }
    }
  },
  {
    name: 'workspace_update',
    description: 'Update a component\'s config and/or state. Use to pre-populate data, move kanban cards, update todo items, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        component_id: { type: 'string', description: 'Component ID (returned from workspace_add)' },
        config: { type: 'object', description: 'New config values to merge (optional)' },
        state: { type: 'object', description: 'New state values to merge (optional)' }
      },
      required: ['component_id']
    }
  },
  {
    name: 'workspace_delete',
    description: 'Remove a component from the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        component_id: { type: 'string', description: 'Component ID to remove' }
      },
      required: ['component_id']
    }
  },
  {
    name: 'workspace_events',
    description: 'Get user interaction events (choices, drags, form submissions). Use this to see what the human has done on the workspace. Optionally filter by timestamp or component.',
    inputSchema: {
      type: 'object',
      properties: {
        since: { type: 'number', description: 'Only events after this timestamp (ms)' },
        component_id: { type: 'string', description: 'Only events from this component' }
      }
    }
  },
  {
    name: 'workspace_title',
    description: 'Set the workspace title displayed at the top of the page.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'New title text' }
      },
      required: ['title']
    }
  },
  {
    name: 'workspace_reset',
    description: 'Reset the workspace to empty state. Removes all components and events.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'workspace_wait',
    description: 'Wait for a user interaction event on a specific component. Blocks until the user acts or timeout. Returns the event data.',
    inputSchema: {
      type: 'object',
      properties: {
        component_id: { type: 'string', description: 'Component to watch' },
        timeout: { type: 'number', description: 'Max seconds to wait (default 300)' }
      },
      required: ['component_id']
    }
  }
];

// ─── Tool handlers ──────────────────────────────────────
async function handleTool(name, args) {
  switch (name) {
    case 'workspace_add':
      return await request('POST', '/api/components', { type: args.type, config: args.config || {} });

    case 'workspace_state': {
      const q = args.component_id ? `?component=${args.component_id}` : '';
      return await request('GET', `/api/state${q}`);
    }

    case 'workspace_update': {
      const body = {};
      if (args.config) body.config = args.config;
      if (args.state) body.state = args.state;
      return await request('PUT', `/api/components/${args.component_id}`, body);
    }

    case 'workspace_delete':
      return await request('DELETE', `/api/components/${args.component_id}`);

    case 'workspace_events': {
      const q = [];
      if (args.since) q.push(`since=${args.since}`);
      if (args.component_id) q.push(`component=${args.component_id}`);
      return await request('GET', `/api/events${q.length ? '?' + q.join('&') : ''}`);
    }

    case 'workspace_title':
      return await request('PUT', '/api/title', { title: args.title });

    case 'workspace_reset':
      return await request('POST', '/api/reset');

    case 'workspace_wait': {
      const timeout = (args.timeout || 300) * 1000;
      const start = Date.now();
      const initialEvents = await request('GET', `/api/events?component=${args.component_id}`);
      const initialCount = Array.isArray(initialEvents) ? initialEvents.length : 0;

      while (Date.now() - start < timeout) {
        await new Promise(r => setTimeout(r, 2000));
        const events = await request('GET', `/api/events?component=${args.component_id}&since=${start}`);
        if (Array.isArray(events) && events.length > 0) {
          return { status: 'event_received', event: events[events.length - 1] };
        }
      }
      return { status: 'timeout', waited_ms: timeout };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── JSON-RPC stdio transport ───────────────────────────
let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  processMessages();
});

function processMessages() {
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;

    const header = buffer.substring(0, headerEnd);
    const lengthMatch = header.match(/Content-Length:\s*(\d+)/i);
    if (!lengthMatch) {
      buffer = buffer.substring(headerEnd + 4);
      continue;
    }

    const contentLength = parseInt(lengthMatch[1], 10);
    const messageStart = headerEnd + 4;

    if (buffer.length < messageStart + contentLength) break;

    const messageBody = buffer.substring(messageStart, messageStart + contentLength);
    buffer = buffer.substring(messageStart + contentLength);

    try {
      const message = JSON.parse(messageBody);
      handleMessage(message);
    } catch (e) {
      // ignore parse errors
    }
  }
}

function sendResponse(id, result) {
  const response = JSON.stringify({ jsonrpc: '2.0', id, result });
  const message = `Content-Length: ${Buffer.byteLength(response)}\r\n\r\n${response}`;
  process.stdout.write(message);
}

function sendError(id, error) {
  const response = JSON.stringify({ jsonrpc: '2.0', id, error: { code: -1, message: error.message || String(error) } });
  const message = `Content-Length: ${Buffer.byteLength(response)}\r\n\r\n${response}`;
  process.stdout.write(message);
}

async function handleMessage(msg) {
  if (msg.method === 'initialize') {
    sendResponse(msg.id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'ws-workspace', version: '1.0.0' }
    });
  } else if (msg.method === 'notifications/initialized') {
    // no response needed
  } else if (msg.method === 'tools/list') {
    sendResponse(msg.id, { tools: TOOLS });
  } else if (msg.method === 'tools/call') {
    try {
      const result = await handleTool(msg.params.name, msg.params.arguments || {});
      sendResponse(msg.id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      });
    } catch (e) {
      sendError(msg.id, e);
    }
  } else {
    sendError(msg.id, new Error(`Method not found: ${msg.method}`));
  }
}

// ─── Ready ──────────────────────────────────────────────
process.stderr.write(`ws-workspace MCP server started (connecting to ${BASE})\n`);
