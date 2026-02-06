import * as vscode from "vscode";

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "clnode-sidebar-webview";

  private _view?: vscode.WebviewView;
  private _onProjectChange?: (projectId: string | null) => void;

  constructor(private port: number, private workspacePaths: string[] = []) {}

  onProjectChange(cb: (projectId: string | null) => void): void {
    this._onProjectChange = cb;
  }

  setProject(projectId: string | null): void {
    this._view?.webview.postMessage({ type: "setProject", projectId });
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this.getHtml();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg.command === "open") {
        vscode.commands.executeCommand(`clnode.open${msg.page}`);
      } else if (msg.command === "selectProject") {
        this._onProjectChange?.(msg.projectId || null);
      }
    });

    // Auto-refresh stats
    this.refreshStats();
    const timer = setInterval(() => this.refreshStats(), 5000);
    webviewView.onDidDispose(() => clearInterval(timer));
  }

  private async refreshStats(): Promise<void> {
    if (!this._view) return;
    try {
      const [statsRes, agentsRes, projectsRes] = await Promise.all([
        fetch(`http://localhost:${this.port}/api/stats`),
        fetch(`http://localhost:${this.port}/api/agents?active=true`),
        fetch(`http://localhost:${this.port}/api/projects`),
      ]);

      if (!statsRes.ok) throw new Error();
      const stats = await statsRes.json();
      const agents = agentsRes.ok ? await agentsRes.json() : [];
      const projects = projectsRes.ok ? await projectsRes.json() : [];

      this._view.webview.postMessage({ type: "stats", stats, agents, projects, workspacePaths: this.workspacePaths });
    } catch {
      this._view.webview.postMessage({ type: "offline" });
    }
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      padding: 12px;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      container-type: inline-size;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .header svg { width: 18px; height: 18px; flex-shrink: 0; }
    .header span { font-weight: 600; font-size: 13px; color: #34d399; }

    .stats {
      display: grid;
      grid-template-columns: 1fr;
      gap: 6px;
      margin-bottom: 16px;
    }
    @container (min-width: 180px) {
      .stats { grid-template-columns: 1fr 1fr; gap: 8px; }
    }
    @container (min-width: 360px) {
      .stats { grid-template-columns: repeat(4, 1fr); }
    }
    .stat {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 10px 6px;
      text-align: center;
    }
    .stat .value {
      font-size: 20px;
      font-weight: 700;
      color: #34d399;
    }
    .stat .label {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
    }

    .content { flex: 1; }

    .nav-section {
      margin-bottom: 16px;
    }
    .nav-section h3 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 6px;
    }

    .nav-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      margin-bottom: 2px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--vscode-foreground);
      font-size: 12px;
      cursor: pointer;
      text-align: left;
    }
    .nav-btn:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .nav-btn .icon {
      width: 16px;
      text-align: center;
      opacity: 0.7;
    }

    .agents-section {
      margin-top: 12px;
    }
    .agent-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 0;
      font-size: 11px;
    }
    .agent-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #34d399;
      flex-shrink: 0;
    }
    .agent-name { color: var(--vscode-foreground); }
    .agent-type { color: var(--vscode-descriptionForeground); font-size: 10px; }

    .footer {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-panel-border);
    }
    .footer h3 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 6px;
    }
    .project-select {
      width: 100%;
      padding: 6px 28px 6px 8px;
      font-size: 11px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
      border-radius: 4px;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
    }
    .project-select:focus {
      border-color: var(--vscode-focusBorder);
    }

    .offline {
      text-align: center;
      padding: 20px;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
    }
    .offline .icon { font-size: 24px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="16" y1="6" x2="7" y2="18" stroke="#34d399" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="16" y1="6" x2="25" y2="18" stroke="#34d399" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="7" y1="18" x2="25" y2="18" stroke="#34d399" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="7" y1="18" x2="16" y2="27" stroke="#34d399" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="25" y1="18" x2="16" y2="27" stroke="#34d399" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="16" cy="6" r="3" fill="#34d399"/>
      <circle cx="7" cy="18" r="2.5" fill="#34d399" opacity="0.85"/>
      <circle cx="25" cy="18" r="2.5" fill="#34d399" opacity="0.85"/>
      <circle cx="16" cy="27" r="2.5" fill="#34d399" opacity="0.7"/>
    </svg>
    <span>clnode</span>
  </div>

  <div class="stats" id="stats">
    <div class="stat">
      <div class="value" id="sessions">-</div>
      <div class="label">Sessions</div>
    </div>
    <div class="stat">
      <div class="value" id="agents-count">-</div>
      <div class="label">Agents</div>
    </div>
    <div class="stat">
      <div class="value" id="context">-</div>
      <div class="label">Context</div>
    </div>
    <div class="stat">
      <div class="value" id="files">-</div>
      <div class="label">Files</div>
    </div>
  </div>

  <div class="content">
    <div class="nav-section">
      <h3>Pages</h3>
      <button class="nav-btn" onclick="openPage('Dashboard')"><span class="icon">\u{1F4CA}</span> Dashboard</button>
      <button class="nav-btn" onclick="openPage('Agents')"><span class="icon">\u{1F916}</span> Agents</button>
      <button class="nav-btn" onclick="openPage('Context')"><span class="icon">\u{1F4DA}</span> Context</button>
      <button class="nav-btn" onclick="openPage('Tasks')"><span class="icon">\u{2705}</span> Tasks</button>
      <button class="nav-btn" onclick="openPage('Activity')"><span class="icon">\u{26A1}</span> Activity</button>
    </div>

    <div class="agents-section" id="agents-list" style="display:none">
      <div class="nav-section"><h3>Active Agents</h3></div>
      <div id="agents-container"></div>
    </div>
  </div>

  <div class="footer" id="footer" style="display:none">
    <h3>Project</h3>
    <select class="project-select" id="project-select" onchange="selectProject(this.value)">
      <option value="">All Projects</option>
    </select>
  </div>

  <div class="offline" id="offline" style="display:none">
    <div class="icon">\u{26A1}</div>
    <div>Daemon offline</div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const state = vscode.getState() || { selectedProject: '', autoDetected: false };

    function openPage(page) {
      vscode.postMessage({ command: 'open', page });
    }

    function selectProject(id) {
      state.selectedProject = id;
      state.autoDetected = true;
      vscode.setState(state);
      vscode.postMessage({ command: 'selectProject', projectId: id });
    }

    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (msg.type === 'stats') {
        document.getElementById('offline').style.display = 'none';
        document.getElementById('stats').style.display = 'grid';

        document.getElementById('sessions').textContent = msg.stats.active_sessions;
        document.getElementById('agents-count').textContent = msg.stats.active_agents;
        document.getElementById('context').textContent = msg.stats.total_context_entries;
        document.getElementById('files').textContent = msg.stats.total_file_changes;

        // Active agents
        const list = document.getElementById('agents-list');
        const container = document.getElementById('agents-container');
        if (msg.agents && msg.agents.length > 0) {
          list.style.display = 'block';
          container.innerHTML = msg.agents.map(a =>
            '<div class="agent-item">' +
              '<div class="agent-dot"></div>' +
              '<span class="agent-name">' + a.agent_name + '</span>' +
              '<span class="agent-type">' + (a.agent_type || '') + '</span>' +
            '</div>'
          ).join('');
        } else {
          list.style.display = 'none';
        }

        // Projects
        const footer = document.getElementById('footer');
        const select = document.getElementById('project-select');
        if (msg.projects && msg.projects.length > 0) {
          footer.style.display = 'block';

          // Auto-detect workspace project on first load
          if (!state.autoDetected && msg.workspacePaths && msg.workspacePaths.length > 0) {
            const match = msg.projects.find(p => msg.workspacePaths.includes(p.path));
            if (match) {
              state.selectedProject = String(match.id);
              state.autoDetected = true;
              vscode.setState(state);
              vscode.postMessage({ command: 'selectProject', projectId: String(match.id) });
            } else {
              state.autoDetected = true;
              vscode.setState(state);
            }
          }

          const saved = state.selectedProject || '';
          select.innerHTML = '<option value="">All Projects</option>' +
            msg.projects.map(p =>
              '<option value="' + p.id + '"' + (String(p.id) === saved ? ' selected' : '') + '>' + p.name + '</option>'
            ).join('');
        } else {
          footer.style.display = 'none';
        }
      } else if (msg.type === 'setProject') {
        state.selectedProject = msg.projectId || '';
        state.autoDetected = true;
        vscode.setState(state);
        const select = document.getElementById('project-select');
        if (select) select.value = state.selectedProject;
      } else if (msg.type === 'offline') {
        document.getElementById('stats').style.display = 'none';
        document.getElementById('agents-list').style.display = 'none';
        document.getElementById('footer').style.display = 'none';
        document.getElementById('offline').style.display = 'block';
      }
    });
  </script>
</body>
</html>`;
  }
}
