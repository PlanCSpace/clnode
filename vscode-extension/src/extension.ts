import * as vscode from "vscode";
import { ApiClient } from "./api-client";
import { StatusBar } from "./status-bar";
import { SidebarViewProvider } from "./sidebar-view";
import { openWebviewPanel, updatePanelProject, disposePanel } from "./webview/panel";
import { ensureDaemon, startDaemon, stopDaemon } from "./daemon";
import { autoInitWorkspace } from "./auto-init";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration("clnode");
  const port = config.get<number>("port", 3100);
  const autoStart = config.get<boolean>("autoStartDaemon", false);
  const pollingInterval = config.get<number>("pollingInterval", 5000);

  const getPort = () => vscode.workspace.getConfiguration("clnode").get<number>("port", 3100);
  const baseUrl = `http://localhost:${port}`;
  const api = new ApiClient(baseUrl);

  // Selected project state
  let selectedProject: string | null = null;

  // Sidebar webview (embed mode — compact stats + nav buttons)
  const workspacePaths = (vscode.workspace.workspaceFolders ?? []).map(f => f.uri.fsPath);
  const sidebarProvider = new SidebarViewProvider(port, workspacePaths);
  sidebarProvider.onProjectChange((projectId) => {
    selectedProject = projectId;
    updatePanelProject(getPort(), projectId);
  });
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarViewProvider.viewType, sidebarProvider)
  );

  // Status bar
  const statusBar = new StatusBar(api);
  statusBar.startPolling(pollingInterval);
  context.subscriptions.push({ dispose: () => statusBar.dispose() });

  // Commands — open full-size webview in editor area
  context.subscriptions.push(
    vscode.commands.registerCommand("clnode.openDashboard", () => openWebviewPanel(getPort(), "/", "clnode Dashboard", selectedProject)),
    vscode.commands.registerCommand("clnode.openTasks", () => openWebviewPanel(getPort(), "/tasks", "clnode Tasks", selectedProject)),
    vscode.commands.registerCommand("clnode.openAgents", () => openWebviewPanel(getPort(), "/agents", "clnode Agents", selectedProject)),
    vscode.commands.registerCommand("clnode.openContext", () => openWebviewPanel(getPort(), "/context", "clnode Context", selectedProject)),
    vscode.commands.registerCommand("clnode.openActivity", () => openWebviewPanel(getPort(), "/activity", "clnode Activity", selectedProject)),
    vscode.commands.registerCommand("clnode.startDaemon", async () => {
      const ok = await startDaemon();
      if (ok) vscode.window.showInformationMessage("clnode daemon started.");
    }),
    vscode.commands.registerCommand("clnode.stopDaemon", async () => {
      await stopDaemon();
      vscode.window.showInformationMessage("clnode daemon stopped.");
    }),
  );

  // Async setup (non-blocking)
  ensureDaemon(baseUrl, autoStart).catch(() => {});
  autoInitWorkspace(port).catch(() => {});
}

export function deactivate(): void {
  disposePanel();
}
