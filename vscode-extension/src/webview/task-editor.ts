import * as vscode from "vscode";
import type { ApiClient } from "../api-client";
import type { Task, TaskComment } from "../types";
import { COLUMNS } from "../types";

const openPanels = new Map<number, vscode.WebviewPanel>();

export async function openTaskEditor(
  task: Task,
  api: ApiClient,
  onUpdate: () => void
): Promise<void> {
  const existing = openPanels.get(task.id);
  if (existing) {
    existing.reveal();
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    "clnode-task-editor",
    `#${task.id} ${task.title}`,
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  openPanels.set(task.id, panel);

  // Load comments
  let comments: TaskComment[] = [];
  try {
    comments = await api.taskComments(task.id);
  } catch { /* no comments */ }

  panel.webview.html = getTaskHtml(task, comments);

  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.type === "save") {
      try {
        await api.updateTask(task.id, msg.data);
        panel.title = `#${task.id} ${msg.data.title ?? task.title}`;
        panel.webview.postMessage({ type: "saved" });
        onUpdate();
      } catch (e) {
        vscode.window.showErrorMessage(`Failed to update: ${e}`);
      }
    } else if (msg.type === "delete") {
      const confirm = await vscode.window.showWarningMessage(
        `Delete task #${task.id}?`, { modal: true }, "Delete"
      );
      if (confirm === "Delete") {
        await api.deleteTask(task.id);
        onUpdate();
        panel.dispose();
      }
    } else if (msg.type === "addComment") {
      try {
        await api.addTaskComment(task.id, {
          content: msg.content,
          author: "vscode-user",
          comment_type: msg.comment_type ?? "general",
        });
        const updated = await api.taskComments(task.id);
        panel.webview.postMessage({ type: "comments", comments: updated });
      } catch (e) {
        vscode.window.showErrorMessage(`Failed to add comment: ${e}`);
      }
    }
  });

  panel.onDidDispose(() => openPanels.delete(task.id));
}

function getTaskHtml(task: Task, comments: TaskComment[]): string {
  const statusLabel = COLUMNS.find((c) => c.key === task.status)?.label ?? task.status;
  const statusColor = getStatusColor(task.status);
  const tagsHtml = (task.tags ?? []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");

  const commentsHtml = comments.length
    ? comments.map((c) => `
      <div class="comment">
        <div class="comment-header">
          <span class="comment-author">${esc(c.author ?? "system")}</span>
          <span class="comment-type ${c.comment_type}">${esc(c.comment_type)}</span>
          <span class="comment-time">${formatTime(c.created_at)}</span>
        </div>
        <div class="comment-body">${esc(c.content)}</div>
      </div>`).join("")
    : '<div class="empty">No comments yet</div>';

  const statusOptions = COLUMNS.map(
    (c) => `<option value="${c.key}" ${c.key === task.status ? "selected" : ""}>${c.label}</option>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --input-bg: var(--vscode-input-background);
    --input-fg: var(--vscode-input-foreground);
    --input-border: var(--vscode-input-border);
    --btn-bg: var(--vscode-button-background);
    --btn-fg: var(--vscode-button-foreground);
    --btn-hover: var(--vscode-button-hoverBackground);
    --btn-secondary-bg: var(--vscode-button-secondaryBackground);
    --btn-secondary-fg: var(--vscode-button-secondaryForeground);
    --border: var(--vscode-panel-border);
    --muted: var(--vscode-descriptionForeground);
    --card-bg: var(--vscode-editorWidget-background);
    --link: var(--vscode-textLink-foreground);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--fg);
    background: var(--bg);
    display: flex;
    flex-direction: column;
    line-height: 1.6;
  }
  .scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
    padding-bottom: 16px;
  }

  /* Header: ID + Status badge */
  .doc-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .task-id { color: var(--muted); font-size: 0.9em; }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 12px;
    border-radius: 12px;
    font-size: 0.8em;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: opacity 0.15s;
  }
  .status-badge:hover { opacity: 0.8; }
  .status-badge .dot { width: 7px; height: 7px; border-radius: 50%; }

  /* Title - contenteditable heading */
  .doc-title {
    font-size: 1.5em;
    font-weight: 700;
    border: none;
    outline: none;
    width: 100%;
    background: transparent;
    color: var(--fg);
    padding: 4px 0;
    margin-bottom: 4px;
    line-height: 1.3;
  }
  .doc-title:empty::before {
    content: 'Untitled';
    color: var(--muted);
  }

  /* Meta line */
  .meta-line {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    font-size: 0.85em;
    color: var(--muted);
    flex-wrap: wrap;
  }
  .meta-item { display: flex; align-items: center; gap: 4px; }
  .meta-item .label { opacity: 0.7; }
  .meta-editable {
    background: transparent;
    border: none;
    border-bottom: 1px dashed transparent;
    color: var(--fg);
    font-family: inherit;
    font-size: inherit;
    outline: none;
    padding: 0 2px;
    min-width: 60px;
  }
  .meta-editable:hover { border-bottom-color: var(--muted); }
  .meta-editable:focus { border-bottom-color: var(--link); }
  .meta-editable::placeholder { color: var(--muted); opacity: 0.6; }

  .tags { display: flex; gap: 4px; flex-wrap: wrap; }
  .tag {
    background: var(--btn-secondary-bg);
    color: var(--btn-secondary-fg);
    padding: 1px 8px;
    border-radius: 10px;
    font-size: 0.8em;
  }

  /* Divider */
  .divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }

  /* Description - editable body */
  .doc-body {
    min-height: 80px;
    outline: none;
    white-space: pre-wrap;
    line-height: 1.7;
    color: var(--fg);
    padding: 4px 0;
  }
  .doc-body:empty::before {
    content: 'Add a description...';
    color: var(--muted);
    opacity: 0.6;
  }

  /* Status dropdown (hidden, shown on badge click) */
  .status-select {
    display: none;
    position: absolute;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 4px;
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .status-select.open { display: block; }
  .status-option {
    display: block;
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: var(--fg);
    width: 100%;
    text-align: left;
    cursor: pointer;
    border-radius: 4px;
    font-family: inherit;
    font-size: inherit;
  }
  .status-option:hover { background: var(--btn-secondary-bg); }
  .status-option.active { color: var(--link); font-weight: 600; }

  /* Save indicator */
  .save-hint {
    position: fixed;
    top: 12px;
    right: 16px;
    font-size: 0.8em;
    color: var(--muted);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .save-hint.visible { opacity: 1; }
  .save-hint.saved { color: #4ade80; }

  /* Comments section */
  .section-title {
    font-size: 0.85em;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
  }
  .comments { margin-top: 0; }
  .comment {
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
  }
  .comment:last-child { border-bottom: none; }
  .comment-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .comment-author { font-weight: 600; font-size: 0.9em; }
  .comment-type {
    font-size: 0.75em;
    padding: 1px 8px;
    border-radius: 10px;
    background: var(--btn-secondary-bg);
    color: var(--btn-secondary-fg);
  }
  .comment-type.review { background: #f59e0b22; color: #fbbf24; }
  .comment-type.plan { background: #3b82f622; color: #60a5fa; }
  .comment-type.fix { background: #ef444422; color: #f87171; }
  .comment-time { font-size: 0.8em; color: var(--muted); margin-left: auto; }
  .comment-body {
    font-size: 0.9em;
    white-space: pre-wrap;
    line-height: 1.5;
  }
  .empty { color: var(--muted); font-style: italic; font-size: 0.9em; }

  /* Comment input - fixed bottom */
  .comment-input-area {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    padding: 12px 32px;
    border-top: 1px solid var(--border);
    background: var(--bg);
    flex-shrink: 0;
  }
  .comment-input {
    flex: 1;
    background: var(--input-bg);
    color: var(--input-fg);
    border: 1px solid var(--input-border);
    border-radius: 6px;
    padding: 8px 10px;
    font-family: inherit;
    font-size: inherit;
    outline: none;
    resize: none;
    min-height: 36px;
    max-height: 120px;
    line-height: 1.4;
  }
  .comment-input:focus { border-color: var(--btn-bg); }
  .send-btn {
    background: var(--btn-bg);
    color: var(--btn-fg);
    border: none;
    border-radius: 6px;
    padding: 8px 14px;
    cursor: pointer;
    font-weight: 600;
    font-family: inherit;
    white-space: nowrap;
  }
  .send-btn:hover { background: var(--btn-hover); }

  /* Bottom actions */
  .bottom-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
    align-items: center;
  }
  .bottom-actions .time { font-size: 0.8em; color: var(--muted); }
  .btn-icon {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.85em;
  }
  .btn-icon:hover { background: var(--btn-secondary-bg); color: var(--fg); }
  .btn-icon.danger:hover { color: var(--vscode-errorForeground); }
  .spacer { flex: 1; }
</style>
</head>
<body>
  <div class="save-hint" id="saveHint">Cmd+S to save</div>

  <div class="scroll-area">
  <div class="doc-header">
    <span class="task-id">#${task.id}</span>
    <button class="status-badge" style="background:${statusColor}22;color:${statusColor}" onclick="toggleStatus()">
      <span class="dot" style="background:${statusColor}"></span>
      <span id="statusLabel">${esc(statusLabel)}</span>
    </button>
    ${task.assigned_to ? `<span class="meta-item" style="margin-left:auto"><span class="label">@</span>${esc(task.assigned_to)}</span>` : ""}
  </div>

  <div class="status-select" id="statusDropdown">
    ${COLUMNS.map((c) => `<button class="status-option ${c.key === task.status ? "active" : ""}" data-value="${c.key}" onclick="setStatus('${c.key}','${esc(c.label)}')">${c.label}</button>`).join("")}
  </div>

  <div class="doc-title" contenteditable="true" id="titleEl">${esc(task.title)}</div>

  <div class="meta-line">
    <div class="meta-item">
      <span class="label">Assigned:</span>
      <input class="meta-editable" id="assignedEl" value="${esc(task.assigned_to ?? "")}" placeholder="unassigned" />
    </div>
    <div class="meta-item">
      <span class="label">Tags:</span>
      <input class="meta-editable" id="tagsEl" value="${esc((task.tags ?? []).join(", "))}" placeholder="none" style="min-width:100px" />
    </div>
  </div>

  <hr class="divider" />

  <div class="doc-body" contenteditable="true" id="descEl">${esc(task.description ?? "")}</div>

  <hr class="divider" />

  <div class="section-title">Comments</div>
  <div class="comments" id="commentsList">${commentsHtml}</div>

  <div class="bottom-actions">
    <span class="time">Created ${formatTime(task.created_at)} &middot; Updated ${formatTime(task.updated_at)}</span>
    <span class="spacer"></span>
    <button class="btn-icon danger" onclick="del()">Delete</button>
  </div>
  </div><!-- end scroll-area -->

  <div class="comment-input-area">
    <textarea class="comment-input" id="commentInput" placeholder="Write a comment..." rows="1"></textarea>
    <button class="send-btn" onclick="addComment()">Send</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let currentStatus = '${task.status}';
    let dirty = false;

    const titleEl = document.getElementById('titleEl');
    const descEl = document.getElementById('descEl');
    const assignedEl = document.getElementById('assignedEl');
    const tagsEl = document.getElementById('tagsEl');
    const saveHint = document.getElementById('saveHint');
    const statusDropdown = document.getElementById('statusDropdown');

    // Track changes
    [titleEl, descEl].forEach(el => el.addEventListener('input', () => markDirty()));
    [assignedEl, tagsEl].forEach(el => el.addEventListener('input', () => markDirty()));

    function markDirty() {
      dirty = true;
      saveHint.textContent = 'Unsaved changes (Cmd+S)';
      saveHint.className = 'save-hint visible';
    }

    function toggleStatus() {
      statusDropdown.classList.toggle('open');
    }

    function setStatus(key, label) {
      currentStatus = key;
      document.getElementById('statusLabel').textContent = label;
      statusDropdown.classList.remove('open');
      // Update badge color
      const colors = {idea:'#a78bfa',planned:'#60a5fa',pending:'#fbbf24',in_progress:'#fb923c',needs_review:'#f472b6',completed:'#4ade80'};
      const badge = document.querySelector('.status-badge');
      const c = colors[key] || '#9ca3af';
      badge.style.background = c + '22';
      badge.style.color = c;
      badge.querySelector('.dot').style.background = c;
      // Update active option
      document.querySelectorAll('.status-option').forEach(o => o.classList.toggle('active', o.dataset.value === key));
      markDirty();
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.status-badge') && !e.target.closest('.status-select')) {
        statusDropdown.classList.remove('open');
      }
    });

    function save() {
      const tags = tagsEl.value.split(',').map(t => t.trim()).filter(Boolean);
      vscode.postMessage({
        type: 'save',
        data: {
          title: titleEl.textContent.trim(),
          description: descEl.textContent.trim() || null,
          status: currentStatus,
          assigned_to: assignedEl.value.trim() || null,
          tags: tags.length ? tags : null
        }
      });
    }

    function del() {
      vscode.postMessage({ type: 'delete' });
    }

    function addComment() {
      const input = document.getElementById('commentInput');
      const content = input.value.trim();
      if (!content) return;
      vscode.postMessage({ type: 'addComment', content, comment_type: 'general' });
      input.value = '';
    }

    // Enter to send comment (Shift+Enter for newline)
    document.getElementById('commentInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addComment();
      }
    });

    // Auto-resize comment input
    document.getElementById('commentInput').addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    // Cmd+S to save
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    });

    // Messages from extension
    window.addEventListener('message', (e) => {
      if (e.data.type === 'saved') {
        dirty = false;
        saveHint.textContent = 'Saved';
        saveHint.className = 'save-hint visible saved';
        setTimeout(() => { saveHint.className = 'save-hint'; }, 2000);
      } else if (e.data.type === 'comments') {
        renderComments(e.data.comments);
      }
    });

    function renderComments(comments) {
      const list = document.getElementById('commentsList');
      if (!comments.length) {
        list.innerHTML = '<div class="empty">No comments yet</div>';
        return;
      }
      list.innerHTML = comments.map(c => {
        const typeClass = ['review','plan','fix'].includes(c.comment_type) ? c.comment_type : '';
        return '<div class="comment">' +
          '<div class="comment-header">' +
            '<span class="comment-author">' + esc(c.author || 'system') + '</span>' +
            '<span class="comment-type ' + typeClass + '">' + esc(c.comment_type) + '</span>' +
            '<span class="comment-time">' + formatTimeJS(c.created_at) + '</span>' +
          '</div>' +
          '<div class="comment-body">' + esc(c.content) + '</div>' +
        '</div>';
      }).join('');
    }

    function esc(s) {
      const d = document.createElement('div');
      d.textContent = s || '';
      return d.innerHTML;
    }

    function formatTimeJS(ts) {
      try {
        return new Date(ts.replace(/Z$/, '')).toLocaleString();
      } catch { return ts; }
    }
  </script>
</body>
</html>`;
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    idea: "#a78bfa", planned: "#60a5fa", pending: "#fbbf24",
    in_progress: "#fb923c", needs_review: "#f472b6", completed: "#4ade80",
  };
  return map[status] ?? "#9ca3af";
}

function formatTime(ts: string): string {
  try {
    return new Date(ts.replace(/Z$/, "")).toLocaleString();
  } catch {
    return ts;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
