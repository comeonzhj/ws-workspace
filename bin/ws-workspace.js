#!/usr/bin/env node

/**
 * ws-workspace — CLI for WS Workspace
 *
 * Commands:
 *   ws-workspace init [name]          — Create a new workspace config
 *   ws-workspace start [--port=PORT]  — Start the server (default: 1989)
 *   ws-workspace add <type> [config]  — Add a component
 *   ws-workspace state [id]           — Get workspace/component state
 *   ws-workspace update <id> [config] [state] — Update component
 *   ws-workspace delete <id>          — Remove a component
 *   ws-workspace events [--since=ts] [--component=id]
 *   ws-workspace reset                — Reset workspace
 *   ws-workspace title <text>         — Set workspace title
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const DEFAULT_PORT = 1989;
const BASE = process.env.WS_URL || `http://localhost:${DEFAULT_PORT}`;

function request(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiPath, BASE);
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
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        reject(new Error(`Cannot connect to server at ${BASE}. Is it running? Start it with: ws-workspace start`));
      } else {
        reject(e);
      }
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function printHelp() {
  console.log(`
  🔧 ws-workspace — Real-time workspace dashboard

  Usage:
    ws-workspace <command> [options]

  Commands:
    init [name]                    Create a new workspace config
    start [--port PORT]            Start the workspace server (default: ${DEFAULT_PORT})
    add <type> [json-config]       Add a component (kanban, todo-list, decision-card, form, table)
    state [component-id]           Get full state or single component state
    update <id> [json-config] [json-state]  Update a component
    delete <id>                    Remove a component
    events [--since=ts] [--component=id]    Get user action events
    title <text>                   Set workspace title
    reset                          Reset the workspace to empty state
    mcp                            Start MCP server (for AI agent integration)
    help                           Show this help

  Environment:
    WS_URL    Server URL (default: http://localhost:${DEFAULT_PORT})
    PORT      Server port for 'start' command (default: ${DEFAULT_PORT})

  Examples:
    ws-workspace start
    ws-workspace start --port 3000
    ws-workspace add kanban '{"columns":["To Do","In Progress","Done"]}'
    ws-workspace add todo-list '{"items":["Buy milk","Walk dog"]}'
    ws-workspace state
    ws-workspace state kanban-a1b2c3d4
`);
}

async function main() {
  const [,, cmd, ...args] = process.argv;

  switch (cmd) {
    case 'init': {
      const name = args[0] || 'my-workspace';
      const configPath = path.join(process.cwd(), 'ws-workspace.json');
      const config = {
        name,
        port: DEFAULT_PORT,
        components: [],
        created: new Date().toISOString(),
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
      console.log(`✅ Workspace "${name}" initialized → ${configPath}`);
      console.log(`   Run 'ws-workspace start' to launch the server.`);
      break;
    }

    case 'start': {
      const portFlag = args.find((a) => a.startsWith('--port'));
      let port = DEFAULT_PORT;
      if (portFlag) {
        port = portFlag.includes('=')
          ? Number(portFlag.split('=')[1])
          : Number(args[args.indexOf(portFlag) + 1]) || DEFAULT_PORT;
      }
      process.env.PORT = String(port);
      process.env.WS_URL = `http://localhost:${port}`;
      // Load the server module — it starts listening immediately
      require(path.join(__dirname, '..', 'server.js'));
      break;
    }

    case 'add': {
      const type = args[0];
      if (!type) {
        console.error('Error: component type required. e.g. ws-workspace add kanban');
        process.exit(1);
      }
      const config = args[1] ? JSON.parse(args[1]) : {};
      const r = await request('POST', '/api/components', { type, config });
      console.log(JSON.stringify(r, null, 2));
      break;
    }

    case 'state': {
      const q = args[0] ? `?component=${args[0]}` : '';
      const r = await request('GET', `/api/state${q}`);
      console.log(JSON.stringify(r, null, 2));
      break;
    }

    case 'update': {
      const id = args[0];
      if (!id) {
        console.error('Error: component id required. e.g. ws-workspace update kanban-a1b2c3d4');
        process.exit(1);
      }
      const body = {};
      if (args[1]) body.config = JSON.parse(args[1]);
      if (args[2]) body.state = JSON.parse(args[2]);
      const r = await request('PUT', `/api/components/${id}`, body);
      console.log(JSON.stringify(r, null, 2));
      break;
    }

    case 'delete': {
      if (!args[0]) {
        console.error('Error: component id required.');
        process.exit(1);
      }
      const r = await request('DELETE', `/api/components/${args[0]}`);
      console.log(JSON.stringify(r));
      break;
    }

    case 'events': {
      const q = [];
      args.forEach((a) => {
        if (a.startsWith('--since=')) q.push(`since=${a.split('=')[1]}`);
        if (a.startsWith('--component=')) q.push(`component=${a.split('=')[1]}`);
      });
      const r = await request('GET', `/api/events${q.length ? '?' + q.join('&') : ''}`);
      console.log(JSON.stringify(r, null, 2));
      break;
    }

    case 'title': {
      const title = args.join(' ');
      if (!title) {
        console.error('Error: title text required.');
        process.exit(1);
      }
      const r = await request('PUT', '/api/title', { title });
      console.log(JSON.stringify(r));
      break;
    }

    case 'reset': {
      const r = await request('POST', '/api/reset');
      console.log(JSON.stringify(r));
      break;
    }

    case 'mcp': {
      // Start MCP server — exec the mcp-server.js as a child process
      const mcpPath = path.join(__dirname, '..', 'mcp-server.js');
      const { execFileSync } = require('child_process');
      try {
        execFileSync(process.execPath, [mcpPath], { stdio: 'inherit' });
      } catch (e) {
        process.exit(e.status || 1);
      }
      break;
    }

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;

    default:
      console.error(`Unknown command: ${cmd}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(`❌ ${e.message}`);
  process.exit(1);
});
