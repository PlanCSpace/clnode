const BASE = "/api";

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  return request<T>(`${BASE}${path}`);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function del<T>(path: string): Promise<T> {
  return request<T>(`${BASE}${path}`, { method: "DELETE" });
}

export interface Project {
  id: string;
  name: string;
  path: string;
  created_at: string;
}

export interface Session {
  id: string;
  project_id: string | null;
  started_at: string;
  ended_at: string | null;
  status: string;
}

export interface Agent {
  id: string;
  session_id: string;
  agent_name: string;
  agent_type: string | null;
  parent_agent_id: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  context_summary: string | null;
  input_tokens: number;
  output_tokens: number;
}

export interface ContextEntry {
  id: number;
  session_id: string;
  agent_id: string | null;
  entry_type: string;
  content: string;
  tags: string[] | null;
  created_at: string;
}

export interface FileChange {
  id: number;
  session_id: string;
  agent_id: string | null;
  file_path: string;
  change_type: string;
  created_at: string;
}

export interface Task {
  id: number;
  project_id: string | null;
  title: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  author: string | null;
  comment_type: string;
  content: string;
  created_at: string;
}

export interface Stats {
  total_sessions: number;
  active_sessions: number;
  total_agents: number;
  active_agents: number;
  total_context_entries: number;
  total_file_changes: number;
}

export interface Activity {
  id: number;
  session_id: string;
  agent_id: string | null;
  event_type: string;
  details: string;
  created_at: string;
}

export interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface AgentContextSize {
  id: string;
  agent_name: string;
  agent_type: string | null;
  context_length: number;
  session_id: string;
}

export interface AgentTokenUsage {
  id: string;
  agent_name: string;
  agent_type: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  session_id: string;
}

export interface TotalTokenUsage {
  input: number;
  output: number;
  total: number;
}

/** DuckDB now() stores local time but JSON serializes with 'Z' suffix.
 *  Strip 'Z' so JS treats it as local time, not UTC. */
export function localDate(ts: string | null): Date | null {
  if (!ts) return null;
  return new Date(ts.replace(/Z$/, ""));
}

export function formatDateTime(ts: string | null): string {
  const d = localDate(ts);
  if (!d) return "—";
  return d.toLocaleString();
}

export function formatTime(ts: string | null): string {
  const d = localDate(ts);
  if (!d) return "—";
  return d.toLocaleTimeString();
}

export const api = {
  health: () => get<{ status: string; uptime: number }>("/health"),
  projects: () => get<Project[]>("/projects"),
  sessions: (active?: boolean, projectId?: string) => {
    const params = new URLSearchParams();
    if (active) params.set("active", "true");
    if (projectId) params.set("project_id", projectId);
    const qs = params.toString();
    return get<Session[]>(`/sessions${qs ? `?${qs}` : ""}`);
  },
  session: (id: string) => get<Session>(`/sessions/${id}`),
  sessionAgents: (id: string) => get<Agent[]>(`/sessions/${id}/agents`),
  sessionContext: (id: string) => get<ContextEntry[]>(`/sessions/${id}/context`),
  sessionFiles: (id: string) => get<FileChange[]>(`/sessions/${id}/files`),
  sessionActivities: (id: string) => get<Activity[]>(`/sessions/${id}/activities`),
  agents: (active?: boolean, projectId?: string) => {
    const params = new URLSearchParams();
    if (active) params.set("active", "true");
    if (projectId) params.set("project_id", projectId);
    const qs = params.toString();
    return get<Agent[]>(`/agents${qs ? `?${qs}` : ""}`);
  },
  agentContext: (id: string) => get<ContextEntry[]>(`/agents/${id}/context`),
  agentFiles: (id: string) => get<FileChange[]>(`/agents/${id}/files`),
  agent: (id: string) => get<Agent>(`/agents/${id}`),
  killAgent: (id: string) => patch<{ ok: boolean }>(`/agents/${id}`, { status: "completed", context_summary: "Manually killed via UI" }),
  tasks: (projectId?: string) => get<Task[]>(`/tasks${projectId ? `?project_id=${projectId}` : ""}`),
  task: (id: number) => get<Task>(`/tasks/${id}`),
  createTask: (data: { project_id?: string; title: string; description?: string; assigned_to?: string; status?: string; tags?: string[] }) =>
    post<{ ok: boolean; id: number }>("/tasks", data),
  updateTask: (id: number, data: Partial<Pick<Task, "title" | "description" | "status" | "assigned_to" | "tags">>) =>
    patch<{ ok: boolean }>(`/tasks/${id}`, data),
  deleteTask: (id: number) => del<{ ok: boolean }>(`/tasks/${id}`),
  taskComments: (taskId: number) => get<TaskComment[]>(`/tasks/${taskId}/comments`),
  addTaskComment: (taskId: number, data: { content: string; author?: string; comment_type?: string }) =>
    post<{ ok: boolean; id: number }>(`/tasks/${taskId}/comments`, data),
  activities: (limit?: number, projectId?: string) => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (projectId) params.set("project_id", projectId);
    const qs = params.toString();
    return get<Activity[]>(`/activities${qs ? `?${qs}` : ""}`);
  },
  stats: (projectId?: string) => get<Stats>(`/stats${projectId ? `?project_id=${projectId}` : ""}`),
  // Usage analytics
  usageDaily: (days?: number) => get<DailyActivity[]>(`/usage/daily${days ? `?days=${days}` : ""}`),
  usageWeekly: () => get<{ messages: number; sessions: number; toolCalls: number }>("/usage/weekly"),
  usageContextSizes: (projectId?: string) => get<AgentContextSize[]>(`/usage/context-sizes${projectId ? `?project_id=${projectId}` : ""}`),
  usageTotalContext: (projectId?: string) => get<{ total: number }>(`/usage/total-context${projectId ? `?project_id=${projectId}` : ""}`),
  usageTokens: (projectId?: string) => get<AgentTokenUsage[]>(`/usage/tokens${projectId ? `?project_id=${projectId}` : ""}`),
  usageTotalTokens: (projectId?: string) => get<TotalTokenUsage>(`/usage/total-tokens${projectId ? `?project_id=${projectId}` : ""}`),
};
