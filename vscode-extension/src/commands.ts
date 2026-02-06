import * as vscode from "vscode";
import type { ApiClient } from "./api-client";
import type { KanbanProvider } from "./treeview/kanban-provider";
import type { AgentsProvider } from "./treeview/agents-provider";
import type { DashboardProvider } from "./treeview/dashboard-provider";
import type { ContextProvider } from "./treeview/context-provider";
import type { ActivityProvider } from "./treeview/activity-provider";
import type { KanbanItem } from "./treeview/kanban-item";
import { openWebviewPanel } from "./webview/panel";
import { startDaemon, stopDaemon } from "./daemon";
import { COLUMNS } from "./types";
import type { ContextEntry, Activity } from "./types";

export function registerCommands(
  context: vscode.ExtensionContext,
  api: ApiClient,
  kanban: KanbanProvider,
  agents: AgentsProvider,
  dashboard: DashboardProvider,
  contextView: ContextProvider,
  activity: ActivityProvider,
  getPort: () => number
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("clnode.openDashboard", () => {
      openWebviewPanel(getPort(), "/", "clnode Dashboard");
    }),

    vscode.commands.registerCommand("clnode.openTasks", () => {
      openWebviewPanel(getPort(), "/tasks", "clnode Tasks");
    }),

    vscode.commands.registerCommand("clnode.openAgents", () => {
      openWebviewPanel(getPort(), "/agents", "clnode Agents");
    }),

    vscode.commands.registerCommand("clnode.openContext", () => {
      openWebviewPanel(getPort(), "/context", "clnode Context");
    }),

    vscode.commands.registerCommand("clnode.openActivity", () => {
      openWebviewPanel(getPort(), "/activity", "clnode Activity");
    }),

    vscode.commands.registerCommand("clnode.refreshKanban", () => {
      kanban.refresh();
    }),

    vscode.commands.registerCommand("clnode.refreshAgents", () => {
      agents.refresh();
    }),

    vscode.commands.registerCommand("clnode.refreshDashboard", () => {
      dashboard.refresh();
    }),

    vscode.commands.registerCommand("clnode.refreshContext", () => {
      contextView.refresh();
    }),

    vscode.commands.registerCommand("clnode.refreshActivity", () => {
      activity.refresh();
    }),

    vscode.commands.registerCommand("clnode.startDaemon", async () => {
      const ok = await startDaemon();
      if (ok) {
        vscode.window.showInformationMessage("clnode daemon started.");
        kanban.refresh();
        agents.refresh();
      }
    }),

    vscode.commands.registerCommand("clnode.stopDaemon", async () => {
      await stopDaemon();
      vscode.window.showInformationMessage("clnode daemon stopped.");
      kanban.refresh();
      agents.refresh();
    }),

    vscode.commands.registerCommand("clnode.createTask", async () => {
      const title = await vscode.window.showInputBox({
        prompt: "Task title",
        placeHolder: "Enter task title",
      });
      if (!title) return;

      const statusPick = await vscode.window.showQuickPick(
        COLUMNS.map((c) => ({ label: c.label, value: c.key })),
        { placeHolder: "Select initial status" }
      );
      const status = statusPick?.value ?? "idea";

      const description = await vscode.window.showInputBox({
        prompt: "Task description (optional)",
        placeHolder: "Enter description or leave empty",
      });

      try {
        await api.createTask({ title, status, description: description || undefined });
        kanban.refresh();
        vscode.window.showInformationMessage(`Task created: ${title}`);
      } catch (e) {
        vscode.window.showErrorMessage(`Failed to create task: ${e}`);
      }
    }),

    vscode.commands.registerCommand("clnode.editTask", async (item: KanbanItem) => {
      if (!item?.task) return;
      const task = item.task;

      const field = await vscode.window.showQuickPick(
        [
          { label: "Title", value: "title" },
          { label: "Description", value: "description" },
          { label: "Status", value: "status" },
          { label: "Assigned To", value: "assigned_to" },
        ],
        { placeHolder: "What do you want to edit?" }
      );
      if (!field) return;

      const update: Record<string, string | undefined> = {};

      if (field.value === "title") {
        const val = await vscode.window.showInputBox({ prompt: "Title", value: task.title });
        if (!val || val === task.title) return;
        update.title = val;
      } else if (field.value === "description") {
        const val = await vscode.window.showInputBox({ prompt: "Description", value: task.description ?? "" });
        if (val === undefined) return;
        update.description = val;
      } else if (field.value === "status") {
        const pick = await vscode.window.showQuickPick(
          COLUMNS.map((c) => ({ label: c.label, value: c.key, picked: c.key === task.status })),
          { placeHolder: `Current: ${task.status}` }
        );
        if (!pick || pick.value === task.status) return;
        update.status = pick.value;
      } else if (field.value === "assigned_to") {
        const val = await vscode.window.showInputBox({ prompt: "Assigned to", value: task.assigned_to ?? "" });
        if (val === undefined) return;
        update.assigned_to = val || undefined;
      }

      try {
        await api.updateTask(task.id, update);
        kanban.refresh();
      } catch (e) {
        vscode.window.showErrorMessage(`Failed to edit task: ${e}`);
      }
    }),

    vscode.commands.registerCommand("clnode.deleteTask", async (item: KanbanItem) => {
      if (!item?.task) return;
      const confirm = await vscode.window.showWarningMessage(
        `Delete task "${item.task.title}"?`,
        { modal: true },
        "Delete"
      );
      if (confirm !== "Delete") return;

      try {
        await api.deleteTask(item.task.id);
        kanban.refresh();
        vscode.window.showInformationMessage("Task deleted.");
      } catch (e) {
        vscode.window.showErrorMessage(`Failed to delete task: ${e}`);
      }
    }),

    vscode.commands.registerCommand("clnode.moveTaskForward", async (item: KanbanItem) => {
      if (!item?.task) return;
      const keys = COLUMNS.map((c) => c.key as string);
      const idx = keys.indexOf(item.task.status);
      if (idx < 0 || idx >= keys.length - 1) return;

      try {
        await api.updateTask(item.task.id, { status: keys[idx + 1] });
        kanban.refresh();
      } catch (e) {
        vscode.window.showErrorMessage(`Failed to move task: ${e}`);
      }
    }),

    vscode.commands.registerCommand("clnode.moveTaskBack", async (item: KanbanItem) => {
      if (!item?.task) return;
      const keys = COLUMNS.map((c) => c.key as string);
      const idx = keys.indexOf(item.task.status);
      if (idx <= 0) return;

      try {
        await api.updateTask(item.task.id, { status: keys[idx - 1] });
        kanban.refresh();
      } catch (e) {
        vscode.window.showErrorMessage(`Failed to move task: ${e}`);
      }
    }),

    vscode.commands.registerCommand("clnode.showContextEntry", async (entry: ContextEntry) => {
      if (!entry) return;
      const tags = entry.tags?.length ? entry.tags.join(", ") : "none";
      const header = [
        `# Context Entry`,
        ``,
        `| Field | Value |`,
        `|-------|-------|`,
        `| **Type** | ${entry.entry_type} |`,
        `| **Agent** | ${entry.agent_id ?? "—"} |`,
        `| **Tags** | ${tags} |`,
        `| **Created** | ${new Date(entry.created_at).toLocaleString()} |`,
        ``,
        `---`,
        ``,
      ].join("\n");
      const doc = await vscode.workspace.openTextDocument({
        content: header + entry.content,
        language: "markdown",
      });
      await vscode.window.showTextDocument(doc, { preview: true });
    }),

    vscode.commands.registerCommand("clnode.showActivityDetail", async (act: Activity) => {
      if (!act) return;
      let detailStr = "";
      if (act.details) {
        try {
          const d = typeof act.details === "string" ? JSON.parse(act.details) : act.details;
          detailStr = JSON.stringify(d, null, 2);
        } catch {
          detailStr = String(act.details);
        }
      }
      const content = [
        `# ${act.event_type}`,
        ``,
        `| Field | Value |`,
        `|-------|-------|`,
        `| **Session** | ${act.session_id} |`,
        `| **Agent** | ${act.agent_id ?? "—"} |`,
        `| **Time** | ${new Date(act.created_at).toLocaleString()} |`,
        ``,
        `## Details`,
        ``,
        "```json",
        detailStr || "{}",
        "```",
      ].join("\n");
      const doc = await vscode.workspace.openTextDocument({
        content,
        language: "markdown",
      });
      await vscode.window.showTextDocument(doc, { preview: true });
    }),

    vscode.commands.registerCommand("clnode.killAgent", async (item: { agentData?: { id: string; agent_name: string } }) => {
      const agent = item?.agentData;
      if (!agent) return;
      const confirm = await vscode.window.showWarningMessage(
        `Kill agent "${agent.agent_name}"?`,
        { modal: true },
        "Kill"
      );
      if (confirm !== "Kill") return;

      try {
        await api.killAgent(agent.id);
        agents.refresh();
        vscode.window.showInformationMessage(`Agent "${agent.agent_name}" killed.`);
      } catch (e) {
        vscode.window.showErrorMessage(`Failed to kill agent: ${e}`);
      }
    })
  );
}
