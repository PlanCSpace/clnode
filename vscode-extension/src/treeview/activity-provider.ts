import * as vscode from "vscode";
import type { ApiClient } from "../api-client";
import type { Activity } from "../types";

class ActivityItem extends vscode.TreeItem {
  constructor(activity: Activity) {
    const time = new Date(activity.created_at).toLocaleTimeString();
    super(activity.event_type, vscode.TreeItemCollapsibleState.None);

    this.description = time;
    this.iconPath = getEventIcon(activity.event_type);

    const tip = new vscode.MarkdownString();
    tip.appendMarkdown(`**${activity.event_type}**\n\n`);
    tip.appendMarkdown(`**Time:** ${new Date(activity.created_at).toLocaleString()}\n\n`);
    tip.appendMarkdown(`**Session:** ${activity.session_id.slice(0, 8)}\n\n`);
    if (activity.agent_id) {
      tip.appendMarkdown(`**Agent:** ${activity.agent_id}\n\n`);
    }
    if (activity.details) {
      try {
        const d = typeof activity.details === "string" ? JSON.parse(activity.details) : activity.details;
        tip.appendCodeblock(JSON.stringify(d, null, 2), "json");
      } catch {
        tip.appendMarkdown(`\`\`\`\n${activity.details}\n\`\`\``);
      }
    }
    this.tooltip = tip;

    // Click to open details
    this.command = {
      command: "clnode.showActivityDetail",
      title: "Show Activity",
      arguments: [activity],
    };
  }
}

function getEventIcon(type: string): vscode.ThemeIcon {
  switch (type) {
    case "SessionStart": return new vscode.ThemeIcon("play", new vscode.ThemeColor("charts.green"));
    case "SessionEnd": return new vscode.ThemeIcon("debug-stop", new vscode.ThemeColor("charts.red"));
    case "SubagentStart": return new vscode.ThemeIcon("run-all", new vscode.ThemeColor("charts.blue"));
    case "SubagentStop": return new vscode.ThemeIcon("debug-step-out", new vscode.ThemeColor("charts.orange"));
    case "PostToolUse": return new vscode.ThemeIcon("tools", new vscode.ThemeColor("charts.purple"));
    case "UserPromptSubmit": return new vscode.ThemeIcon("comment", new vscode.ThemeColor("charts.yellow"));
    case "Stop": return new vscode.ThemeIcon("circle-slash");
    default: return new vscode.ThemeIcon("pulse");
  }
}

export class ActivityProvider implements vscode.TreeDataProvider<ActivityItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private api: ApiClient) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ActivityItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<ActivityItem[]> {
    try {
      const activities = await this.api.activities(50);
      if (activities.length === 0) {
        const empty = new ActivityItem({
          id: 0, session_id: "", agent_id: null,
          event_type: "No activity", details: "", created_at: new Date().toISOString(),
        });
        return [empty];
      }
      return activities.map((a) => new ActivityItem(a));
    } catch {
      return [];
    }
  }
}
