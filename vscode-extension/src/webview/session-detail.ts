import * as vscode from "vscode";
import type { ApiClient } from "../api-client";
import type { Activity, Agent, ContextEntry, FileChange } from "../types";

const openPanels = new Map<string, vscode.WebviewPanel>();

export async function openSessionDetail(sessionId: string, api: ApiClient): Promise<void> {
  const existing = openPanels.get(sessionId);
  if (existing) {
    existing.reveal();
    return;
  }

  const shortId = sessionId.slice(0, 8);
  const panel = vscode.window.createWebviewPanel(
    "clnode-session-detail",
    `Session ${shortId}…`,
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  openPanels.set(sessionId, panel);
  panel.onDidDispose(() => openPanels.delete(sessionId));

  // Loading state
  panel.webview.html = getLoadingHtml(shortId);

  try {
    const [agents, activities, context, files] = await Promise.all([
      api.sessionAgents(sessionId),
      api.sessionActivities(sessionId),
      api.sessionContext(sessionId),
      api.sessionFiles(sessionId),
    ]);
    panel.webview.html = getSessionHtml(sessionId, agents, activities, context, files);
  } catch (e) {
    panel.webview.html = getErrorHtml(shortId, String(e));
  }
}

function getLoadingHtml(shortId: string): string {
  return baseHtml(`
    <div class="header">
      <h1>Session ${shortId}…</h1>
      <span class="badge loading">Loading…</span>
    </div>
  `);
}

function getErrorHtml(shortId: string, error: string): string {
  return baseHtml(`
    <div class="header">
      <h1>Session ${shortId}…</h1>
      <span class="badge error">Error</span>
    </div>
    <p class="error-text">${esc(error)}</p>
  `);
}

function getSessionHtml(
  sessionId: string,
  agents: Agent[],
  activities: Activity[],
  context: ContextEntry[],
  files: FileChange[]
): string {
  const shortId = sessionId.slice(0, 8);
  const agentCount = agents.length;
  const activeAgents = agents.filter((a) => a.status === "running").length;

  // Build timeline from all events, sorted by time
  const timeline: TimelineItem[] = [];

  for (const a of agents) {
    timeline.push({
      time: a.started_at,
      type: "agent_start",
      icon: "play",
      color: "green",
      title: `${a.agent_name} started`,
      subtitle: a.agent_type ?? undefined,
      detail: undefined,
    });
    if (a.completed_at) {
      timeline.push({
        time: a.completed_at,
        type: "agent_stop",
        icon: a.status === "completed" ? "check" : "x",
        color: a.status === "completed" ? "blue" : "red",
        title: `${a.agent_name} ${a.status}`,
        subtitle: a.context_summary ? truncate(a.context_summary, 200) : undefined,
        detail: a.context_summary ?? undefined,
      });
    }
  }

  for (const act of activities) {
    const agent = agents.find((a) => a.id === act.agent_id);
    timeline.push({
      time: act.created_at,
      type: "activity",
      icon: getActivityIcon(act.event_type),
      color: getActivityColor(act.event_type),
      title: act.event_type,
      subtitle: agent?.agent_name ?? undefined,
      detail: act.details,
    });
  }

  for (const ctx of context) {
    const agent = agents.find((a) => a.id === ctx.agent_id);
    timeline.push({
      time: ctx.created_at,
      type: "context",
      icon: "bookmark",
      color: "purple",
      title: `Context: ${ctx.entry_type}`,
      subtitle: agent?.agent_name ?? undefined,
      detail: truncate(ctx.content, 300),
    });
  }

  for (const f of files) {
    const agent = agents.find((a) => a.id === f.agent_id);
    timeline.push({
      time: f.created_at,
      type: "file",
      icon: "file",
      color: f.change_type === "Edit" ? "yellow" : "green",
      title: `${f.change_type}: ${f.file_path.split("/").pop()}`,
      subtitle: agent?.agent_name ?? undefined,
      detail: f.file_path,
    });
  }

  timeline.sort((a, b) => a.time.localeCompare(b.time));

  // Agent summary cards
  const agentCards = agents
    .map((a) => {
      const statusClass = a.status === "running" ? "running" : a.status === "completed" ? "completed" : "error";
      const tokens = a.input_tokens + a.output_tokens;
      return `
      <div class="agent-card ${statusClass}">
        <div class="agent-header">
          <span class="agent-icon">${getStatusDot(a.status)}</span>
          <strong>${esc(a.agent_name)}</strong>
          <span class="agent-type">${esc(a.agent_type ?? "")}</span>
        </div>
        ${tokens ? `<div class="agent-tokens">${a.input_tokens.toLocaleString()} in / ${a.output_tokens.toLocaleString()} out</div>` : ""}
        ${a.context_summary ? `<div class="agent-summary">${esc(truncate(a.context_summary, 150))}</div>` : ""}
      </div>`;
    })
    .join("\n");

  // Timeline HTML
  const timelineHtml = timeline
    .map(
      (item) => `
    <div class="timeline-item">
      <div class="timeline-dot ${item.color}"></div>
      <div class="timeline-content">
        <div class="timeline-header">
          <span class="timeline-title">${esc(item.title)}</span>
          <span class="timeline-time">${formatTime(item.time)}</span>
        </div>
        ${item.subtitle ? `<div class="timeline-subtitle">${esc(item.subtitle)}</div>` : ""}
        ${item.detail ? `<div class="timeline-detail">${esc(item.detail)}</div>` : ""}
      </div>
    </div>`
    )
    .join("\n");

  return baseHtml(`
    <div class="header">
      <h1>Session ${esc(shortId)}…</h1>
      ${activeAgents > 0 ? '<span class="badge live">LIVE</span>' : '<span class="badge ended">ENDED</span>'}
    </div>
    <div class="stats-row">
      <div class="stat"><span class="stat-val">${agentCount}</span><span class="stat-label">Agents</span></div>
      <div class="stat"><span class="stat-val">${activities.length}</span><span class="stat-label">Events</span></div>
      <div class="stat"><span class="stat-val">${context.length}</span><span class="stat-label">Context</span></div>
      <div class="stat"><span class="stat-val">${files.length}</span><span class="stat-label">Files</span></div>
    </div>

    ${agentCards ? `<h2>Agents</h2><div class="agent-grid">${agentCards}</div>` : ""}

    <h2>Timeline</h2>
    <div class="timeline">${timelineHtml || '<div class="empty">No events yet</div>'}</div>
  `);
}

interface TimelineItem {
  time: string;
  type: string;
  icon: string;
  color: string;
  title: string;
  subtitle?: string;
  detail?: string;
}

function baseHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --muted: var(--vscode-descriptionForeground);
    --border: var(--vscode-panel-border);
    --card-bg: var(--vscode-editorWidget-background);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--fg);
    background: var(--bg);
    padding: 20px 28px;
    line-height: 1.6;
  }
  .header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  h1 { font-size: 1.4em; font-weight: 600; }
  h2 { font-size: 1.1em; font-weight: 600; margin: 24px 0 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.85em; }
  .badge {
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 0.75em;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge.live { background: #22c55e22; color: #4ade80; }
  .badge.ended { background: #6b728022; color: #9ca3af; }
  .badge.loading { background: #3b82f622; color: #60a5fa; }
  .badge.error { background: #ef444422; color: #f87171; }
  .error-text { color: #f87171; margin-top: 12px; }

  /* Stats */
  .stats-row { display: flex; gap: 16px; margin-bottom: 8px; }
  .stat {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 20px;
    text-align: center;
    min-width: 80px;
  }
  .stat-val { display: block; font-size: 1.5em; font-weight: 700; }
  .stat-label { display: block; font-size: 0.8em; color: var(--muted); }

  /* Agent cards */
  .agent-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .agent-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 16px;
    min-width: 220px;
    flex: 1;
    max-width: 350px;
  }
  .agent-card.running { border-left: 3px solid #4ade80; }
  .agent-card.completed { border-left: 3px solid #60a5fa; }
  .agent-card.error { border-left: 3px solid #f87171; }
  .agent-header { display: flex; align-items: center; gap: 8px; }
  .agent-icon { font-size: 0.8em; }
  .agent-type { color: var(--muted); font-size: 0.85em; margin-left: auto; }
  .agent-tokens { font-size: 0.8em; color: var(--muted); margin-top: 4px; }
  .agent-summary {
    font-size: 0.85em;
    color: var(--muted);
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
    white-space: pre-wrap;
  }

  /* Timeline */
  .timeline { position: relative; padding-left: 24px; }
  .timeline::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--border);
  }
  .timeline-item {
    position: relative;
    margin-bottom: 4px;
    padding: 8px 0;
  }
  .timeline-dot {
    position: absolute;
    left: -20px;
    top: 14px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--bg);
  }
  .timeline-dot.green { background: #4ade80; }
  .timeline-dot.blue { background: #60a5fa; }
  .timeline-dot.red { background: #f87171; }
  .timeline-dot.yellow { background: #facc15; }
  .timeline-dot.purple { background: #c084fc; }
  .timeline-dot.gray { background: #6b7280; }

  .timeline-content {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 14px;
  }
  .timeline-header { display: flex; align-items: center; justify-content: space-between; }
  .timeline-title { font-weight: 600; font-size: 0.95em; }
  .timeline-time { font-size: 0.8em; color: var(--muted); white-space: nowrap; }
  .timeline-subtitle { font-size: 0.85em; color: var(--muted); margin-top: 2px; }
  .timeline-detail {
    font-size: 0.85em;
    color: var(--muted);
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .empty { color: var(--muted); font-style: italic; padding: 12px 0; }
</style>
</head>
<body>${body}</body>
</html>`;
}

function getStatusDot(status: string): string {
  if (status === "running") return "\u{1F7E2}";
  if (status === "completed") return "\u{1F535}";
  return "\u{1F534}";
}

function getActivityIcon(eventType: string): string {
  if (eventType.includes("Start")) return "play";
  if (eventType.includes("Stop")) return "stop";
  if (eventType.includes("Tool")) return "wrench";
  if (eventType.includes("Prompt")) return "chat";
  return "circle";
}

function getActivityColor(eventType: string): string {
  if (eventType.includes("Start")) return "green";
  if (eventType.includes("Stop")) return "blue";
  if (eventType.includes("Error")) return "red";
  if (eventType.includes("Tool")) return "yellow";
  return "gray";
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts.replace(/Z$/, ""));
    return d.toLocaleTimeString();
  } catch {
    return ts;
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
