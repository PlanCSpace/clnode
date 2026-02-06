import * as vscode from "vscode";
import type { ApiClient } from "../api-client";
import type { Agent, Session } from "../types";

export class AgentTreeItem extends vscode.TreeItem {
  constructor(
    public readonly kind: "session" | "agent",
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly agentData?: Agent,
    public readonly sessionId?: string
  ) {
    super(label, collapsibleState);

    if (kind === "session" && sessionId) {
      this.contextValue = "session";
      this.iconPath = new vscode.ThemeIcon("terminal");
    } else if (kind === "agent" && agentData) {
      this.contextValue = "agent";
      this.id = `agent-${agentData.id}`;
      this.description = agentData.agent_type ?? "unknown";
      this.iconPath = getAgentIcon(agentData.status);
      this.tooltip = buildAgentTooltip(agentData);
    }
  }
}

function getAgentIcon(status: string): vscode.ThemeIcon {
  switch (status) {
    case "running":
      return new vscode.ThemeIcon("sync~spin", new vscode.ThemeColor("charts.green"));
    case "completed":
      return new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.blue"));
    case "error":
      return new vscode.ThemeIcon("error", new vscode.ThemeColor("charts.red"));
    default:
      return new vscode.ThemeIcon("circle-outline");
  }
}

function buildAgentTooltip(agent: Agent): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**${agent.agent_name}**\n\n`);
  md.appendMarkdown(`**Type:** ${agent.agent_type ?? "unknown"}\n\n`);
  md.appendMarkdown(`**Status:** ${agent.status}\n\n`);
  md.appendMarkdown(`**Started:** ${agent.started_at}\n\n`);
  if (agent.input_tokens || agent.output_tokens) {
    md.appendMarkdown(`**Tokens:** ${agent.input_tokens} in / ${agent.output_tokens} out`);
  }
  return md;
}

export class AgentsProvider implements vscode.TreeDataProvider<AgentTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<AgentTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private sessions: Session[] = [];
  private agents: Agent[] = [];

  constructor(private api: ApiClient) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AgentTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: AgentTreeItem): Promise<AgentTreeItem[]> {
    if (!element) {
      // Root: load active sessions
      try {
        [this.sessions, this.agents] = await Promise.all([
          this.api.sessions(true),
          this.api.agents(true),
        ]);
      } catch {
        this.sessions = [];
        this.agents = [];
      }

      if (this.sessions.length === 0) {
        return [
          new AgentTreeItem("session", "No active sessions", vscode.TreeItemCollapsibleState.None),
        ];
      }

      return this.sessions.map((s) => {
        const agentCount = this.agents.filter((a) => a.session_id === s.id).length;
        return new AgentTreeItem(
          "session",
          `Session ${s.id.slice(0, 8)}… (${agentCount} agents)`,
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          s.id
        );
      });
    }

    if (element.kind === "session") {
      // Find the session ID from the label
      const sessionIdPrefix = element.label?.toString().match(/Session ([a-f0-9]+)/)?.[1];
      if (!sessionIdPrefix) return [];

      const session = this.sessions.find((s) => s.id.startsWith(sessionIdPrefix));
      if (!session) return [];

      return this.agents
        .filter((a) => a.session_id === session.id)
        .map(
          (a) =>
            new AgentTreeItem(
              "agent",
              a.agent_name,
              vscode.TreeItemCollapsibleState.None,
              a
            )
        );
    }

    return [];
  }

  getAgentById(agentId: string): Agent | undefined {
    return this.agents.find((a) => a.id === agentId);
  }
}
