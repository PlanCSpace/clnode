import { useEffect, useState } from "react";
import { api, type Agent, type Session, formatDateTime, formatTime } from "../lib/api";
import { useWebSocket } from "../lib/useWebSocket";

type Filter = "all" | "active" | "completed";

export default function Agents() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [agentsBySession, setAgentsBySession] = useState<Record<string, Agent[]>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const { events, reconnectCount } = useWebSocket();

  const loadData = async () => {
    const allSessions = await api.sessions();
    setSessions(allSessions);
    const map: Record<string, Agent[]> = {};
    await Promise.all(
      allSessions.map(async (s) => {
        map[s.id] = await api.sessionAgents(s.id);
      })
    );
    setAgentsBySession(map);
  };

  useEffect(() => { loadData(); }, [reconnectCount]);
  useEffect(() => { if (events.length > 0) loadData(); }, [events.length]);

  const allAgents = Object.values(agentsBySession).flat();
  const totalCount = allAgents.length;

  const filterAgents = (agents: Agent[]) =>
    filter === "all" ? agents : agents.filter((a) => a.status === filter);

  const visibleSessions = sessions.filter((s) => filterAgents(agentsBySession[s.id] ?? []).length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold">Agents</h2>
        <div className="flex gap-1">
          {(["all", "active", "completed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs ${filter === f ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">{totalCount} agents</span>
      </div>

      <div className="space-y-4">
        {visibleSessions.length === 0 && <p className="text-gray-600 text-sm">No agents found</p>}
        {visibleSessions.map((session) => {
          const agents = filterAgents(agentsBySession[session.id] ?? []);
          return (
            <div key={session.id} className="space-y-1">
              <div className="flex items-center gap-2 px-1">
                <span className={`w-2 h-2 rounded-full ${session.status === "active" ? "bg-green-500" : "bg-gray-600"}`} />
                <span className="text-xs font-mono text-gray-400">
                  {session.id.slice(0, 12)}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  session.status === "active" ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"
                }`}>
                  {session.status}
                </span>
                {session.project_id && (
                  <span className="text-xs text-gray-500">{session.project_id}</span>
                )}
                <span className="text-xs text-gray-600">
                  {formatDateTime(session.started_at)}
                </span>
              </div>
              {agents.map((agent, i) => (
                <AgentCard key={agent.id} agent={agent} isLast={i === agents.length - 1} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentCard({ agent, isLast }: { agent: Agent; isLast: boolean }) {
  const statusColor = agent.status === "active"
    ? "bg-green-900 text-green-300"
    : "bg-gray-800 text-gray-400";

  return (
    <div className="flex items-start gap-2 ml-3">
      <span className="text-gray-400 text-sm mt-2.5 shrink-0">{isLast ? "└─" : "├─"}</span>
      <div className="bg-gray-900 border border-gray-800 rounded p-3 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-white">{agent.agent_name}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor}`}>
            {agent.status}
          </span>
          {agent.agent_type && agent.agent_type !== agent.agent_name && (
            <span className="text-xs text-gray-500">[{agent.agent_type}]</span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1 flex gap-3">
          <span>id: {agent.id.slice(0, 12)}</span>
          {agent.completed_at && (
            <span>completed: {formatTime(agent.completed_at)}</span>
          )}
        </div>
        {agent.context_summary && (
          <div className="mt-2 text-xs text-gray-300 bg-gray-800 rounded p-2">
            {agent.context_summary}
          </div>
        )}
      </div>
    </div>
  );
}
