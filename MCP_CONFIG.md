# MCP Server 配置指南

WS Workspace 提供 MCP (Model Context Protocol) 服务器，让支持 MCP 的 AI Agent 可以通过标准化工具协议操作工作台。

## 快速配置

### Claude Desktop / Cursor / 其他 MCP 客户端

在 MCP 配置文件中添加：

```json
{
  "mcpServers": {
    "ws-workspace": {
      "command": "npx",
      "args": ["-y", "ws-workspace", "mcp"],
      "env": {
        "WS_PORT": "1989"
      }
    }
  }
}
```

> `WS_PORT` 是工作台服务器的端口，需要先用 `ws-workspace start` 启动工作台。

### 全局安装后

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

## 可用工具 (Tools)

MCP 服务器暴露以下工具：

| Tool | 说明 | 关键参数 |
|------|------|----------|
| `workspace_add` | 添加组件 | `type`, `config` |
| `workspace_state` | 读取状态 | `component_id` (可选) |
| `workspace_update` | 更新组件 | `component_id`, `config`, `state` |
| `workspace_delete` | 删除组件 | `component_id` |
| `workspace_events` | 读取事件 | `since`, `component_id` |
| `workspace_title` | 设置标题 | `title` |
| `workspace_reset` | 重置工作台 | (无) |
| `workspace_wait` | 等待人类操作 | `component_id`, `timeout` |

### 工具详情

#### `workspace_add`

添加一个组件到工作台。

```json
{
  "type": "kanban",
  "config": {
    "title": "功能优先级",
    "columns": ["想法", "评估中", "已确认", "开发中"]
  }
}
```

返回创建的组件 JSON（含 `id`，后续操作需要）。

#### `workspace_state`

获取工作台或指定组件的状态。

```json
// 完整状态
{}

// 指定组件
{ "component_id": "kanban-a1b2c3d4" }
```

#### `workspace_update`

更新组件的配置或状态。

```json
{
  "component_id": "kanban-a1b2c3d4",
  "config": { "title": "新标题" },
  "state": { "想法": ["功能A"], "已确认": ["功能B"] }
}
```

#### `workspace_events`

获取用户交互事件。可按时间和组件过滤。

```json
// 所有事件
{}

// 指定组件的事件
{ "component_id": "decision-card-xyz" }

// 最近 5 分钟的事件
{ "since": 1715400000000 }
```

#### `workspace_wait`

阻塞等待用户在指定组件上的操作。适合需要"等人类做决定"的场景。

```json
{
  "component_id": "decision-card-xyz",
  "timeout": 300
}
```

返回：
```json
{
  "status": "event_received",
  "event": {
    "component_id": "decision-card-xyz",
    "event": "user_choice",
    "data": { "selected": "option-a", "comment": "这个更好" }
  }
}
```

超时返回 `{"status": "timeout"}`。

## 典型 Agent 使用流程

1. Agent 启动工作台：`ws-workspace start`
2. Agent 通过 MCP `workspace_add` 注入组件
3. 人类在浏览器上操作
4. Agent 通过 `workspace_state` 或 `workspace_events` 读取人类的操作
5. Agent 根据状态继续推进

## 同时使用 CLI 和 MCP

CLI 和 MCP 操作同一个工作台服务器，可以混用：

```bash
# 终端 1：启动工作台
ws-workspace start

# 终端 2：CLI 添加组件
ws-workspace add heading '{"text":"标题"}'

# Agent：通过 MCP 读取状态
# → workspace_state 工具
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WS_PORT` | `1989` | 工作台服务器端口 |
| `WS_URL` | `http://localhost:{WS_PORT}` | 工作台服务器地址（覆盖端口） |

## 故障排查

**Agent 报错 "Cannot connect to workspace server"**
→ 确保工作台已启动：`ws-workspace start`

**工具返回空数据**
→ 工作台可能还没添加组件，先用 `workspace_add` 添加

**`workspace_wait` 超时**
→ 确认人类已经打开了工作台页面，且在操作指定的组件
