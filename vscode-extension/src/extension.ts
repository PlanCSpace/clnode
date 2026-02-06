import * as vscode from "vscode";
import { ApiClient } from "./api-client";
import { StatusBar } from "./status-bar";
import { WsClient } from "./ws-client";
import { KanbanProvider } from "./treeview/kanban-provider";
import { KanbanDragDropController } from "./treeview/drag-drop-controller";
import { AgentsProvider } from "./treeview/agents-provider";
import { registerCommands } from "./commands";
import { ensureDaemon } from "./daemon";
import { autoInitWorkspace } from "./auto-init";
import { disposePanel } from "./webview/panel";
import { openTaskEditor } from "./webview/task-editor";
import { openSessionDetail } from "./webview/session-detail";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration("clnode");
  const port = config.get<number>("port", 3100);
  const autoStart = config.get<boolean>("autoStartDaemon", false);
  const pollingInterval = config.get<number>("pollingInterval", 5000);

  const getPort = () => vscode.workspace.getConfiguration("clnode").get<number>("port", 3100);
  const baseUrl = `http://localhost:${port}`;

  const api = new ApiClient(baseUrl);

  // Ensure clnode is installed + daemon is running
  await ensureDaemon(baseUrl, autoStart);

  // Auto-init: install hooks for workspace if not present
  await autoInitWorkspace(port);

  // Status bar
  const statusBar = new StatusBar(api);
  statusBar.startPolling(pollingInterval);
  context.subscriptions.push({ dispose: () => statusBar.dispose() });

  // Kanban TreeView
  const kanbanProvider = new KanbanProvider(api);
  const kanbanTree = vscode.window.createTreeView("clnode-kanban", {
    treeDataProvider: kanbanProvider,
    showCollapseAll: true,
    canSelectMany: false,
    dragAndDropController: new KanbanDragDropController(api, kanbanProvider),
  });
  // Open task editor on click
  kanbanTree.onDidChangeSelection((e) => {
    const item = e.selection[0];
    if (item?.kind === "task" && item.task) {
      openTaskEditor(item.task, api, () => kanbanProvider.refresh());
    }
  });
  context.subscriptions.push(kanbanTree);

  // Agents TreeView
  const agentsProvider = new AgentsProvider(api);
  const agentsTree = vscode.window.createTreeView("clnode-agents", {
    treeDataProvider: agentsProvider,
    showCollapseAll: true,
  });
  // Open session detail on click
  agentsTree.onDidChangeSelection((e) => {
    const item = e.selection[0];
    if (item?.kind === "session" && item.sessionId) {
      openSessionDetail(item.sessionId, api);
    }
  });
  context.subscriptions.push(agentsTree);

  // Register commands
  registerCommands(context, api, kanbanProvider, agentsProvider, getPort);

  // WebSocket for real-time updates
  const wsClient = new WsClient(`ws://localhost:${port}/ws`);
  wsClient.onRefresh(() => {
    kanbanProvider.refresh();
    agentsProvider.refresh();
    statusBar.update();
  });
  wsClient.connect();
  context.subscriptions.push({ dispose: () => wsClient.dispose() });

  // Fallback polling (in case WS is not available)
  const pollTimer = setInterval(() => {
    kanbanProvider.refresh();
    agentsProvider.refresh();
  }, pollingInterval);
  context.subscriptions.push({ dispose: () => clearInterval(pollTimer) });
}

export function deactivate(): void {
  disposePanel();
}
