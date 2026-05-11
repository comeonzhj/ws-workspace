# WS Workspace

**中文** | [English](./README.md)

> 从 Markdown 到 HTML：AI Agent 与人类共享一个可交互的实时工作台。

灵感来自 [Thariq 的《The Unreasonable Effectiveness of HTML》](https://x.com/trq212/status/2052809885763747935)——HTML 作为 Agent 与人类的沟通媒介，远比 Markdown 更强大。WS Workspace 在此基础上更进一步：Agent 不再只是*输出* HTML，而是**维护一个可交互的工作台**，人类直接在上面操作，信息在网页上持续生长而非对话流中滚走。

```
Agent ──CLI──▶ HTML 工作台 ──交互──▶ 人类
  ▲                                     │
  └──────────WebSocket 状态────────────┘
```

## 快速开始

```bash
npx ws-workspace start
```

浏览器打开 `http://localhost:1989`。工作台初始为空——由 Agent（或你通过 CLI）添加组件。

```bash
# 添加一个看板
npx ws-workspace add kanban '{"columns":["想法","评估中","已确认","开发中"]}'

# 添加一个决策卡
npx ws-workspace add decision-card '{"question":"先做哪个方向？","options":[{"value":"a","label":"方案 A"},{"value":"b","label":"方案 B"}]}'

# 添加一个待办清单
npx ws-workspace add todo-list '{"title":"行动项","items":["调研","原型","开发","上线"]}'
```

页面通过 WebSocket 实时更新。用户拖拽卡片、点击选项、勾选待办——所有状态以结构化 JSON 回流给 Agent。

## 全局安装

```bash
npm install -g ws-workspace
ws-workspace start
```

## CLI 命令

| 命令 | 说明 |
|---|---|
| `ws-workspace start [--port PORT]` | 启动工作台服务（默认 1989） |
| `ws-workspace init [name]` | 创建工作台配置文件 |
| `ws-workspace add <type> [json-config]` | 添加组件 |
| `ws-workspace state [component-id]` | 获取完整状态或单个组件 |
| `ws-workspace update <id> [json-config] [json-state]` | 更新组件配置或状态 |
| `ws-workspace delete <id>` | 删除组件 |
| `ws-workspace title <text>` | 设置工作台标题 |
| `ws-workspace events [--since=ts] [--component=id]` | 获取用户交互事件 |
| `ws-workspace reset` | 重置工作台 |

## 组件类型

| 类型 | 说明 | 用户可做的操作 |
|---|---|---|
| `heading` | 标题 + 副标题 | 纯展示 |
| `kanban` | 多列看板 | 拖拽卡片、新增卡片 |
| `decision-card` | 单选题 + 备注 | 点击选择、填写备注 |
| `todo-list` | 待办清单 | 勾选/取消、新增条目 |
| `form` | 结构化表单 | 填写字段、提交 |
| `table` | 数据表格 | 查看数据 |
| `rich-editor` | 富文本编辑区 | 自由书写 |

### 组件示例

```bash
# 自定义列的看板
ws-workspace add kanban '{"title":"功能优先级","columns":["待办","进行中","完成"]}'

# 带描述的决策卡
ws-workspace add decision-card '{"title":"选方向","question":"哪个方案？","options":[{"value":"fast","label":"快速上线","description":"MVP，1周"},{"value":"complete","label":"完整交付","description":"全功能，3周"}]}'

# 多字段表单
ws-workspace add form '{"title":"配置","fields":[{"name":"name","label":"项目名","type":"text"},{"name":"priority","label":"优先级","type":"select","options":["P0","P1","P2"]},{"name":"notes","label":"备注","type":"textarea"}]}'

# 数据表格
ws-workspace add table '{"title":"团队","headers":["姓名","角色","状态"],"rows":[["Alice","PM","活跃"],["Bob","开发","活跃"],["Carol","设计","休假"]]}'

# 富文本编辑器
ws-workspace add rich-editor '{"title":"会议纪要","placeholder":"写下你的想法..."}'

# 带初始条目的待办
ws-workspace add todo-list '{"title":"上线清单","items":["代码审查","QA 测试","部署","发布公告"]}'
```

## REST API

所有端点位于 `http://localhost:1989/api/`：

| 方法 | 路径 | 请求体 | 说明 |
|---|---|---|---|
| `GET` | `/api/state` | — | 完整工作台状态 |
| `GET` | `/api/state?component=<id>` | — | 单个组件状态 |
| `GET` | `/api/events?since=<ts>&component=<id>` | — | 用户交互事件 |
| `POST` | `/api/components` | `{type, config}` | 添加组件 |
| `PUT` | `/api/components/:id` | `{config?, state?}` | 更新组件 |
| `DELETE` | `/api/components/:id` | — | 删除组件 |
| `PUT` | `/api/title` | `{title}` | 设置标题 |
| `POST` | `/api/reset` | — | 重置 |

## For Agents

如果你是一个 AI Agent，正在读这个 repo——以下是上手指南：

### 安装并启动

```bash
npm install -g ws-workspace
ws-workspace start --port 1989
```

### 工作流程

1. **启动服务**：`ws-workspace start`
2. **告诉人类** URL（如 `http://localhost:1989`）
3. **通过 CLI 添加组件**推进协作：
   - `heading` 划分工作区章节
   - `kanban` 做排序、分类、状态跟踪
   - `decision-card` 需要人类做选择时
   - `form` 收集结构化输入
   - `todo-list` 做 checklist
   - `table` 做对比矩阵
   - `rich-editor` 让人类自由书写
4. **读取状态**：`ws-workspace state` 获取所有组件及其当前状态
5. **读取事件**：`ws-workspace events` 查看人类做了什么（选了什么、拖了什么卡片、提交了什么表单）
6. **更新组件**：随工作推进迭代

### 技巧

- 每次 `add` 都会返回组件 JSON（含 `id`），保存下来——后续 `update`、`delete` 需要用。
- `events` 是你的"耳朵"——给人类交互任务后检查它。里面是结构化数据，不是自然语言。
- 决策卡：人类的选择在 `state.selected`，备注在 `state.comment`。
- 看板：卡片可在列之间拖拽，`state` 反映当前各列内容。
- 不同端口可跑多个工作台：`ws-workspace start --port 3001`

### Agent 协作示例

```bash
# Agent 启动工作台
ws-workspace start --port 1989

# 添加标题
ws-workspace add heading '{"text":"Sprint 规划","level":1,"subtitle":"本周要 ship 什么？"}'

# 添加看板并预填充
ws-workspace add kanban '{"title":"本周任务","columns":["候选","首选","已承诺","已交付"]}'
ws-workspace update kanban-a1b2c3d4 '{}' '{"候选":["认证重构","API v2","暗色模式","移动端"],"首选":[],"已承诺":[],"已交付":[]}'

# 添加决策卡
ws-workspace add decision-card '{"question":"哪个功能最重要？","options":[{"value":"auth","label":"认证重构","description":"安全合规"},{"value":"api","label":"API v2","description":"开发者体验"},{"value":"dark","label":"暗色模式","description":"用户满意度"}]}'

# 等待人类操作后读取
ws-workspace state decision-card-xyz
# → { "selected": "api", "comment": "DevEx 是当前瓶颈" }

# 基于选择继续推进...
```

## 架构

```
┌─────────────┐    WebSocket     ┌─────────────┐
│   浏览器     │ ◄─────────────▶ │   服务器     │
│  (HTML UI)  │   实时更新       │  (Express +  │
│             │   + 用户事件     │   WebSocket) │
└─────────────┘                  └──────┬──────┘
                                        │ REST API
                                 ┌──────▼──────┐
                                 │  Agent/CLI   │
                                 │ (ws-workspace│
                                 │   命令)      │
                                 └─────────────┘
```

- **服务器** (`server.js`)：Express 提供 HTML 工作台，WebSocket 推送状态给浏览器，REST API 接受 Agent 命令
- **前端** (`public/index.html`)：单 HTML 文件 + 内联 Web Components，Claude 暖色主题
- **CLI** (`bin/ws-workspace.js`)：Agent 命令行接口，翻译命令为 REST 调用

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `1989` | 服务器监听端口 |
| `WS_URL` | `http://localhost:1989` | CLI 连接地址 |

## 致谢

本项目灵感来自 Thariq Mallik 的 [《The Unreasonable Effectiveness of HTML》](https://x.com/trq212/status/2052809885763747935)（2026 年 5 月），该文论述了 HTML 作为 Agent 与人类沟通媒介远优于 Markdown。WS Workspace 将这一理念延伸为双向协作协议。

## 许可证

MIT © [jiaai](https://github.com/comeonzhj)
