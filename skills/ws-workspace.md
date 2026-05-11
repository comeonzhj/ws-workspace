---
name: ws-workspace
description: "HTML 协作工作台：Agent 通过 CLI/MCP 往网页注入交互组件（看板、决策卡、待办、表单等），人类在页面上操作，状态实时回流给 Agent。当需要跟人类协作做规划、排序、选择、收集输入时使用。"
tags: [workspace, collaboration, interactive, kanban, html, agent]
---

# WS Workspace — HTML 协作工作台

Agent 维护一个可交互的 HTML 页面，人类直接在上面操作。信息不再存在于对话流中，而是在网页上持续生长。

## 核心理念

传统模式：Agent 输出 Markdown → 人类读完 → 打字回复 → Agent 再输出（线性、单向、读后即焚）

工作台模式：Agent 通过指令注入组件 → 人类在页面上拖拽/选择/填写 → Agent 读取结构化状态 → 继续推进（持续、双向、状态累积）

```
Agent ──CLI/MCP──▶ HTML 工作台 ──交互──▶ 人类
  ▲                                          │
  └─────────WebSocket 状态回流───────────────┘
```

## 安装

```bash
npm install -g ws-workspace
```

或直接使用：

```bash
npx ws-workspace start
```

## 启动工作台

```bash
# 默认端口 1989
ws-workspace start

# 自定义端口
ws-workspace start --port 3000
```

启动后告诉人类 URL（如 `http://localhost:1989`），然后通过 CLI 或 MCP 添加组件。

## 组件类型

根据协作场景选择合适的组件：

| 场景 | 组件 | CLI 命令 |
|------|------|----------|
| 划分工作区章节 | `heading` | `ws-workspace add heading '{"text":"标题","level":1}'` |
| 优先级排序/状态跟踪 | `kanban` | `ws-workspace add kanban '{"columns":["待办","进行中","完成"]}'` |
| 方案选择/A/B 决策 | `decision-card` | `ws-workspace add decision-card '{"question":"选哪个？","options":[...]}'` |
| 行动项/检查清单 | `todo-list` | `ws-workspace add todo-list '{"items":["任务1","任务2"]}'` |
| 收集结构化参数 | `form` | `ws-workspace add form '{"fields":[...]}'` |
| 对比矩阵/数据表 | `table` | `ws-workspace add table '{"headers":[...],"rows":[...]}'` |
| 自由书写/头脑风暴 | `rich-editor` | `ws-workspace add rich-editor '{"placeholder":"..."}'` |

## 工作流程（Agent 操作指南）

### 1. 启动并告知人类

```bash
ws-workspace start --port 1989
# 告诉人类：请打开 http://localhost:1989
```

### 2. 用组件构建工作区

```bash
# 添加标题
ws-workspace add heading '{"text":"Q2 规划","level":1,"subtitle":"一起来决定本季度重点"}'

# 添加看板并预填充
ws-workspace add kanban '{"title":"功能优先级","columns":["想法","评估中","已确认","开发中"]}'
# 拿到返回的 id 后，可以预填充状态
ws-workspace update kanban-XXXX '{}' '{"想法":["功能A","功能B","功能C"],"评估中":[],"已确认":[],"开发中":[]}'

# 添加决策卡
ws-workspace add decision-card '{"title":"方向选择","question":"哪个最值得先做？","options":[{"value":"a","label":"功能A","description":"提升留存"},{"value":"b","label":"功能B","description":"提升转化"}]}'
```

### 3. 读取人类的操作

```bash
# 读取完整状态
ws-workspace state

# 读取指定组件（拿到人类的选择）
ws-workspace state decision-card-XXXX
# → { "selected": "a", "comment": "留存更重要" }

# 读取事件日志
ws-workspace events
```

### 4. 根据状态继续推进

拿到人类的选择后，更新组件或添加新组件继续协作。

## 读取状态的关键路径

- **决策卡**：`state.selected` = 人类选了什么，`state.comment` = 备注
- **看板**：`state` 的每个 key 是列名，value 是该列的卡片数组
- **待办**：`state.items[].done` = 是否完成
- **表单**：`state.values` = 字段名到值的映射
- **编辑器**：`state.content` = 人类写的内容

## 使用技巧

- 每次 `add` 返回组件 JSON（含 `id`），保存下来用于后续 `update`/`delete`
- `events` 是你的"耳朵"——给人类交互任务后检查它
- 不同端口可跑多个工作台：`ws-workspace start --port 3001`
- 看板支持拖拽，人类可以直接在列之间移动卡片
- 决策卡支持备注，人类可以附加说明

## REST API

所有端点位于 `http://localhost:1989/api/`：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/state` | 完整状态 |
| GET | `/api/state?component=<id>` | 单个组件 |
| GET | `/api/events` | 事件日志 |
| POST | `/api/components` | 添加组件 `{type, config}` |
| PUT | `/api/components/:id` | 更新组件 `{config?, state?}` |
| DELETE | `/api/components/:id` | 删除组件 |
| PUT | `/api/title` | 设置标题 `{title}` |
| POST | `/api/reset` | 重置 |

## MCP 配置

如果使用 MCP 协议，在 Agent 配置中添加：

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

MCP 提供以下工具：
- `workspace_add` — 添加组件
- `workspace_state` — 读取状态
- `workspace_update` — 更新组件
- `workspace_delete` — 删除组件
- `workspace_events` — 读取事件
- `workspace_wait` — 等待人类操作（阻塞式）

## 相关链接

- [GitHub](https://github.com/comeonzhj/ws-workspace)
- [npm](https://www.npmjs.com/package/ws-workspace)
- [范式介绍页](https://comeonzhj.github.io/ws-workspace/)
