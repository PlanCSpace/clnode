import * as vscode from "vscode";
import type { ApiClient } from "../api-client";
import type { KanbanItem } from "./kanban-item";
import type { KanbanProvider } from "./kanban-provider";
import { COLUMNS } from "../types";

const MIME = "application/vnd.code.tree.clnode-kanban";

export class KanbanDragDropController implements vscode.TreeDragAndDropController<KanbanItem> {
  dropMimeTypes = [MIME];
  dragMimeTypes = [MIME];

  constructor(
    private api: ApiClient,
    private provider: KanbanProvider
  ) {}

  handleDrag(source: readonly KanbanItem[], dataTransfer: vscode.DataTransfer): void {
    // Only allow dragging tasks
    const tasks = source.filter((item) => item.kind === "task" && item.task);
    if (tasks.length === 0) return;

    dataTransfer.set(
      MIME,
      new vscode.DataTransferItem(tasks.map((t) => t.task!.id))
    );
  }

  async handleDrop(target: KanbanItem | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
    if (!target) return;

    const raw = dataTransfer.get(MIME);
    if (!raw) return;

    const taskIds = raw.value as number[];
    if (!taskIds?.length) return;

    // Determine target status
    let targetStatus: string | undefined;
    if (target.kind === "column") {
      targetStatus = target.columnKey;
    } else if (target.kind === "task" && target.task) {
      targetStatus = target.task.status;
    }

    if (!targetStatus) return;

    // Validate the target status
    const validKeys = COLUMNS.map((c) => c.key as string);
    if (!validKeys.includes(targetStatus)) return;

    // Update each task
    for (const id of taskIds) {
      try {
        await this.api.updateTask(id, { status: targetStatus });
      } catch {
        vscode.window.showErrorMessage(`Failed to move task #${id}`);
      }
    }

    this.provider.refresh();
  }
}
