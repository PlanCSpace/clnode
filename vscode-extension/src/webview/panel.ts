import * as vscode from "vscode";
import { getWebviewHtml } from "./html-provider";

let currentPanel: vscode.WebviewPanel | undefined;

export function openWebviewPanel(port: number, route: string = "/", title?: string): void {
  const column = vscode.window.activeTextEditor
    ? vscode.ViewColumn.Beside
    : vscode.ViewColumn.One;

  if (currentPanel) {
    currentPanel.webview.html = getWebviewHtml(port, route);
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

  currentPanel.webview.html = getWebviewHtml(port, route);

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  });
}

export function disposePanel(): void {
  currentPanel?.dispose();
}
