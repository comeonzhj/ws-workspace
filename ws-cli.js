#!/usr/bin/env node
/**
 * ws-cli — Agent CLI for WS Workspace
 * Usage: node ws-cli.js <command> [args...]
 *
 * Commands:
 *   state                         — Get full workspace state
 *   state <component-id>          — Get component state
 *   title <text>                  — Set workspace title
 *   add <type> [json-config]      — Add component
 *   update <id> [json-config] [json-state]
 *   delete <id>                   — Remove component
 *   events [--since=ts] [--component=id]
 *   reset                         — Reset workspace
 */

const http = require('http');

const BASE = process.env.WS_URL || 'http://localhost:1989';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const [,, cmd, ...args] = process.argv;

  switch (cmd) {
    case 'state': {
      const q = args[0] ? `?component=${args[0]}` : '';
      const r = await request('GET', `/api/state${q}`);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'title': {
      const title = args.join(' ');
      const r = await request('PUT', '/api/title', { title });
      console.log(JSON.stringify(r));
      break;
    }
    case 'add': {
      const type = args[0];
      const config = args[1] ? JSON.parse(args[1]) : {};
      const r = await request('POST', '/api/components', { type, config });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'update': {
      const id = args[0];
      const body = {};
      if (args[1]) body.config = JSON.parse(args[1]);
      if (args[2]) body.state = JSON.parse(args[2]);
      const r = await request('PUT', `/api/components/${id}`, body);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'delete': {
      const r = await request('DELETE', `/api/components/${args[0]}`);
      console.log(JSON.stringify(r));
      break;
    }
    case 'events': {
      let q = [];
      args.forEach(a => {
        if (a.startsWith('--since=')) q.push(`since=${a.split('=')[1]}`);
        if (a.startsWith('--component=')) q.push(`component=${a.split('=')[1]}`);
      });
      const r = await request('GET', `/api/events${q.length ? '?' + q.join('&') : ''}`);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'reset': {
      const r = await request('POST', '/api/reset');
      console.log(JSON.stringify(r));
      break;
    }
    default:
      console.log('Usage: ws-cli.js <state|title|add|update|delete|events|reset> [args...]');
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
