const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  return res.json() as Promise<T>;
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
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: number;
  session_id: string;
  agent_id: string | null;
  event_type: string;
  details: string;
  created_at: string;
}

export const api = {
  health: () => get<{ status: string; uptime: number }>("/health"),
  projects: () => get<Project[]>("/projects"),
  sessions: (active?: boolean) => get<Session[]>(`/sessions${active ? "?active=true" : ""}`),
  session: (id: string) => get<Session>(`/sessions/${id}`),
  sessionAgents: (id: string) => get<Agent[]>(`/sessions/${id}/agents`),
  sessionContext: (id: string) => get<ContextEntry[]>(`/sessions/${id}/context`),
  sessionFiles: (id: string) => get<FileChange[]>(`/sessions/${id}/files`),
  sessionActivities: (id: string) => get<Activity[]>(`/sessions/${id}/activities`),
  agents: (active?: boolean) => get<Agent[]>(`/agents${active ? "?active=true" : ""}`),
  tasks: (projectId?: string) => get<Task[]>(`/tasks${projectId ? `?project_id=${projectId}` : ""}`),
  activities: (limit?: number) => get<Activity[]>(`/activities${limit ? `?limit=${limit}` : ""}`),
};
