import * as vscode from "vscode";
import type { ApiClient } from "../api-client";
import type { ContextEntry, Session } from "../types";

export class ContextTreeItem extends vscode.TreeItem {
  constructor(
    public readonly kind: "session" | "entry",
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly sessionId?: string,
    public readonly entry?: ContextEntry
  ) {
    super(label, collapsibleState);

    if (kind === "session") {
      this.iconPath = new vscode.ThemeIcon("terminal");
    } else if (entry) {
      this.iconPath = getEntryIcon(entry.entry_type);
      this.description = entry.entry_type;
      this.tooltip = new vscode.MarkdownString();
      this.tooltip.appendMarkdown(`**${entry.entry_type}**\n\n`);
      if (entry.tags?.length) {
        this.tooltip.appendMarkdown(`**Tags:** ${entry.tags.join(", ")}\n\n`);
      }
      this.tooltip.appendMarkdown(`---\n\n${entry.content.slice(0, 500)}`);

      // Click to open content
      this.command = {
        command: "clnode.showContextEntry",
        title: "Show Context",
        arguments: [entry],
      };
    }
  }
}

function getEntryIcon(type: string): vscode.ThemeIcon {
  switch (type) {
    case "decision": return new vscode.ThemeIcon("lightbulb", new vscode.ThemeColor("charts.yellow"));
    case "summary": return new vscode.ThemeIcon("note", new vscode.ThemeColor("charts.blue"));
    case "error": return new vscode.ThemeIcon("error", new vscode.ThemeColor("charts.red"));
    case "task_result": return new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.green"));
    case "agent_summary": return new vscode.ThemeIcon("organization", new vscode.ThemeColor("charts.green"));
    default: return new vscode.ThemeIcon("bookmark");
  }
}

export class ContextProvider implements vscode.TreeDataProvider<ContextTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private sessions: Session[] = [];

  constructor(private api: ApiClient) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ContextTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ContextTreeItem): Promise<ContextTreeItem[]> {
    if (!element) {
      try {
        this.sessions = await this.api.sessions();
        const recent = this.sessions.slice(0, 10);
        if (recent.length === 0) {
          return [new ContextTreeItem("entry", "No sessions", vscode.TreeItemCollapsibleState.None)];
        }
        return recent.map((s) => {
          const time = new Date(s.started_at).toLocaleString();
          const label = `${s.project_id ?? "unknown"} — ${s.id.slice(0, 8)}`;
          const item = new ContextTreeItem("session", label, vscode.TreeItemCollapsibleState.Collapsed, s.id);
          item.description = `${s.status} · ${time}`;
          return item;
        });
      } catch {
        return [new ContextTreeItem("entry", "Offline", vscode.TreeItemCollapsibleState.None)];
      }
    }

    if (element.kind === "session" && element.sessionId) {
      try {
        const entries = await this.api.sessionContext(element.sessionId);
        if (entries.length === 0) {
          return [new ContextTreeItem("entry", "(no context entries)", vscode.TreeItemCollapsibleState.None)];
        }
        return entries.map((e) => {
          const preview = e.content.slice(0, 60).replace(/\n/g, " ");
          return new ContextTreeItem("entry", preview, vscode.TreeItemCollapsibleState.None, undefined, e);
        });
      } catch {
        return [];
      }
    }

    return [];
  }
}
