import * as vscode from "vscode";
import type { ApiClient } from "../api-client";
import type { Task } from "../types";
import { COLUMNS } from "../types";
import { KanbanItem } from "./kanban-item";

export class KanbanProvider implements vscode.TreeDataProvider<KanbanItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<KanbanItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private tasks: Task[] = [];

  constructor(private api: ApiClient) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: KanbanItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: KanbanItem): Promise<KanbanItem[]> {
    if (!element) {
      // Root: load tasks, return columns
      try {
        this.tasks = await this.api.tasks();
      } catch {
        this.tasks = [];
      }

      return COLUMNS.map((col) => {
        const count = this.tasks.filter((t) => t.status === col.key).length;
        const state =
          col.key === "completed"
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.Expanded;
        return new KanbanItem("column", `${col.label} (${count})`, state, undefined, col.key);
      });
    }

    if (element.kind === "column" && element.columnKey) {
      // Column children: tasks in this status, sorted by updated_at desc
      const columnTasks = this.tasks
        .filter((t) => t.status === element.columnKey)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

      return columnTasks.map(
        (t) => new KanbanItem("task", t.title, vscode.TreeItemCollapsibleState.None, t, element.columnKey)
      );
    }

    return [];
  }

  findTask(taskId: number): Task | undefined {
    return this.tasks.find((t) => t.id === taskId);
  }
}
