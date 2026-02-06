import * as vscode from "vscode";
import type { ApiClient } from "../api-client";
import type { Stats } from "../types";

class DashboardItem extends vscode.TreeItem {
  constructor(label: string, description: string, icon: string, color?: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon(icon, color ? new vscode.ThemeColor(color) : undefined);
  }
}

export class DashboardProvider implements vscode.TreeDataProvider<DashboardItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private api: ApiClient) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DashboardItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<DashboardItem[]> {
    try {
      const stats: Stats = await this.api.stats();
      return [
        new DashboardItem(
          "Sessions",
          `${stats.active_sessions} active / ${stats.total_sessions} total`,
          "terminal",
          "charts.green"
        ),
        new DashboardItem(
          "Agents",
          `${stats.active_agents} active / ${stats.total_agents} total`,
          "organization",
          "charts.blue"
        ),
        new DashboardItem(
          "Context Entries",
          `${stats.total_context_entries}`,
          "book",
          "charts.yellow"
        ),
        new DashboardItem(
          "File Changes",
          `${stats.total_file_changes}`,
          "file",
          "charts.purple"
        ),
      ];
    } catch {
      return [new DashboardItem("Offline", "daemon not reachable", "circle-slash", "errorForeground")];
    }
  }
}
