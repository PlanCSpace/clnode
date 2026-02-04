import { useEffect, useState } from "react";
import { api, type Agent } from "../lib/api";

type Filter = "all" | "active" | "completed";

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    api.agents().then(setAgents);
  }, []);

  const roots = agents.filter((a) => !a.parent_agent_id);
  const childrenOf = (parentId: string) => agents.filter((a) => a.parent_agent_id === parentId);

  const filtered = filter === "all" ? roots : roots.filter((a) => a.status === filter);

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
        <span className="text-xs text-gray-500">{agents.length} total</span>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-gray-600 text-sm">No agents found</p>}
        {filtered.map((agent) => (
          <AgentNode key={agent.id} agent={agent} childrenOf={childrenOf} depth={0} />
        ))}
      </div>
    </div>
  );
}

function AgentNode({
  agent,
  childrenOf,
  depth,
}: {
  agent: Agent;
  childrenOf: (id: string) => Agent[];
  depth: number;
}) {
  const children = childrenOf(agent.id);
  const statusColor = agent.status === "active"
    ? "bg-green-900 text-green-300"
    : "bg-gray-800 text-gray-400";

  return (
    <div style={{ marginLeft: depth * 24 }}>
      <div className="bg-gray-900 border border-gray-800 rounded p-3">
        <div className="flex items-center gap-2">
          {depth > 0 && <span className="text-gray-600 text-xs">└─</span>}
          <span className="font-mono text-sm text-white">{agent.agent_name}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor}`}>
            {agent.status}
          </span>
          {agent.agent_type && (
            <span className="text-xs text-gray-500">[{agent.agent_type}]</span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1 flex gap-3">
          <span>id: {agent.id.slice(0, 12)}</span>
          <span>session: {agent.session_id.slice(0, 12)}</span>
          {agent.completed_at && (
            <span>completed: {new Date(agent.completed_at).toLocaleTimeString()}</span>
          )}
        </div>
        {agent.context_summary && (
          <div className="mt-2 text-xs text-gray-300 bg-gray-800 rounded p-2">
            {agent.context_summary}
          </div>
        )}
      </div>
      {children.map((child) => (
        <AgentNode key={child.id} agent={child} childrenOf={childrenOf} depth={depth + 1} />
      ))}
    </div>
  );
}
