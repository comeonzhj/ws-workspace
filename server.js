const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── State ───────────────────────────────────────────
let state = {
  title: '工作台',
  components: [],
  events: [] // 用户操作事件日志
};

function uid() { return crypto.randomBytes(4).toString('hex'); }

// ─── Broadcast to all browsers ────────────────────────
function broadcast(type, payload, excludeWs) {
  const msg = JSON.stringify({ type, payload, ts: Date.now() });
  wss.clients.forEach(c => {
    if (c.readyState === 1 && c !== excludeWs) c.send(msg);
  });
}

// ─── WebSocket (browser ↔ server) ────────────────────
wss.on('connection', (ws) => {
  // 新连接时推送完整状态
  ws.send(JSON.stringify({ type: 'init', payload: state, ts: Date.now() }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      // 用户操作事件
      if (msg.type === 'user_event') {
        const evt = {
          id: uid(),
          component_id: msg.component_id,
          event: msg.event,
          data: msg.data,
          ts: Date.now()
        };
        state.events.push(evt);

        // 更新组件内部状态
        const comp = state.components.find(c => c.id === msg.component_id);
        if (comp && msg.new_state) {
          comp.state = { ...comp.state, ...msg.new_state };
        }

        // 广播给其他客户端（不包括发送者自己）
        broadcast('state_update', { component_id: msg.component_id, new_state: msg.new_state, event: evt }, ws);
        console.log(`[user_event] ${msg.component_id}.${msg.event}`, JSON.stringify(msg.data));
      }
    } catch (e) {
      console.error('ws message parse error:', e);
    }
  });
});

// ─── REST API (Agent / CLI) ──────────────────────────

// 获取完整状态
app.get('/api/state', (req, res) => {
  const filter = req.query.component;
  if (filter) {
    const comp = state.components.find(c => c.id === filter);
    return res.json(comp || { error: 'not found' });
  }
  res.json(state);
});

// 获取用户事件（可选 ?since=timestamp&component=xxx）
app.get('/api/events', (req, res) => {
  let evts = state.events;
  if (req.query.since) evts = evts.filter(e => e.ts > Number(req.query.since));
  if (req.query.component) evts = evts.filter(e => e.component_id === req.query.component);
  res.json(evts);
});

// 设置工作台标题
app.put('/api/title', (req, res) => {
  state.title = req.body.title || '工作台';
  broadcast('title_update', { title: state.title });
  res.json({ ok: true, title: state.title });
});

// 添加组件
app.post('/api/components', (req, res) => {
  const { type, config } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });

  const id = `${type}-${uid()}`;
  const comp = { id, type, config: config || {}, state: {} };

  // 根据类型初始化 state
  if (type === 'kanban') {
    const cols = (config.columns || ['待办', '进行中', '完成']);
    comp.state = {};
    cols.forEach(c => { comp.state[c] = []; });
  } else if (type === 'todo-list') {
    comp.state = { items: (config.items || []).map(text => ({ id: uid(), text, done: false })) };
  } else if (type === 'decision-card') {
    comp.state = { selected: null, comment: '' };
  } else if (type === 'form') {
    comp.state = { values: {} };
  } else if (type === 'table') {
    comp.state = { rows: config.rows || [] };
  }

  state.components.push(comp);
  broadcast('component_added', comp);
  console.log(`[add] ${type} -> ${id}`);
  res.json(comp);
});

// 更新组件
app.put('/api/components/:id', (req, res) => {
  const comp = state.components.find(c => c.id === req.params.id);
  if (!comp) return res.status(404).json({ error: 'not found' });

  const { config, state: newState } = req.body;
  if (config) comp.config = { ...comp.config, ...config };
  if (newState) comp.state = { ...comp.state, ...newState };

  broadcast('component_updated', comp);
  console.log(`[update] ${comp.id}`);
  res.json(comp);
});

// 删除组件
app.delete('/api/components/:id', (req, res) => {
  const idx = state.components.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const [removed] = state.components.splice(idx, 1);
  broadcast('component_removed', { id: removed.id });
  console.log(`[delete] ${removed.id}`);
  res.json({ ok: true, id: removed.id });
});

// 重置
app.post('/api/reset', (req, res) => {
  state = { title: '工作台', components: [], events: [] };
  broadcast('reset', state);
  console.log('[reset]');
  res.json({ ok: true });
});

// ─── Start ────────────────────────────────────────────
const PORT = process.env.PORT || 1989;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🔧 WS Workspace running at:`);
  console.log(`     Local:    http://localhost:${PORT}`);
  console.log(`     Network:  http://0.0.0.0:${PORT}\n`);
});
