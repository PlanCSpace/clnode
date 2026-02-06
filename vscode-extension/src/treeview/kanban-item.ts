import * as vscode from "vscode";
import type { Task } from "../types";

export class KanbanItem extends vscode.TreeItem {
  constructor(
    public readonly kind: "column" | "task",
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly task?: Task,
    public readonly columnKey?: string
  ) {
    super(label, collapsibleState);

    if (kind === "column") {
      this.contextValue = "column";
      this.iconPath = new vscode.ThemeIcon("layout");
    } else if (kind === "task" && task) {
      this.contextValue = "task";
      this.id = `task-${task.id}`;
      this.description = task.assigned_to ? `@${task.assigned_to}` : undefined;
      this.iconPath = getTaskIcon(task.status);
      this.tooltip = buildTooltip(task);
    }
  }
}

function getTaskIcon(status: string): vscode.ThemeIcon {
  switch (status) {
    case "idea":
      return new vscode.ThemeIcon("lightbulb", new vscode.ThemeColor("charts.purple"));
    case "planned":
      return new vscode.ThemeIcon("map", new vscode.ThemeColor("charts.blue"));
    case "pending":
      return new vscode.ThemeIcon("clock", new vscode.ThemeColor("charts.yellow"));
    case "in_progress":
      return new vscode.ThemeIcon("sync~spin", new vscode.ThemeColor("charts.orange"));
    case "needs_review":
      return new vscode.ThemeIcon("eye", new vscode.ThemeColor("charts.red"));
    case "completed":
      return new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.green"));
    default:
      return new vscode.ThemeIcon("circle-outline");
  }
}

function buildTooltip(task: Task): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**${task.title}**\n\n`);
  if (task.description) {
    md.appendMarkdown(`${task.description}\n\n`);
  }
  md.appendMarkdown(`---\n\n`);
  md.appendMarkdown(`**Status:** ${task.status}\n\n`);
  if (task.assigned_to) {
    md.appendMarkdown(`**Assigned:** @${task.assigned_to}\n\n`);
  }
  if (task.tags?.length) {
    md.appendMarkdown(`**Tags:** ${task.tags.join(", ")}\n\n`);
  }
  md.appendMarkdown(`**Updated:** ${task.updated_at}`);
  return md;
}
