import * as vscode from "vscode";
import { getWebviewHtml } from "./html-provider";

let currentPanel: vscode.WebviewPanel | undefined;
let currentPort: number;
let currentRoute: string;

export function openWebviewPanel(port: number, route: string = "/", title?: string, projectId?: string | null): void {
  const column = vscode.window.activeTextEditor
    ? vscode.ViewColumn.Beside
    : vscode.ViewColumn.One;

  currentPort = port;
  currentRoute = route;

  if (currentPanel) {
    currentPanel.webview.html = getWebviewHtml(port, route, projectId);
    currentPanel.title = title ?? "clnode Dashboard";
    currentPanel.reveal(column);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    "clnode-webview",
    title ?? "clnode Dashboard",
    column,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  currentPanel.webview.html = getWebviewHtml(port, route, projectId);

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  });
}

export function updatePanelProject(port: number, projectId: string | null): void {
  if (!currentPanel) return;
  currentPanel.webview.html = getWebviewHtml(port, currentRoute || "/", projectId);
}

export function disposePanel(): void {
  currentPanel?.dispose();
}
