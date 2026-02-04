import { useEffect, useState } from "react";
import { api, type ContextEntry, type Session } from "../lib/api";

export default function Context() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [entries, setEntries] = useState<ContextEntry[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.sessions().then((s) => {
      setSessions(s);
      if (s.length > 0) setSelectedSession(s[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedSession) {
      api.sessionContext(selectedSession).then(setEntries);
    }
  }, [selectedSession]);

  const filtered = search
    ? entries.filter(
        (e) =>
          e.content.toLowerCase().includes(search.toLowerCase()) ||
          e.entry_type.toLowerCase().includes(search.toLowerCase()) ||
          (e.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : entries;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Context Store</h2>

      <div className="flex gap-3">
        <select
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.id} ({s.status})</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search content, type, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white flex-1"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-gray-600 text-sm">No context entries</p>}
        {filtered.map((entry) => (
          <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-900 text-purple-300">
                {entry.entry_type}
              </span>
              {entry.agent_id && (
                <span className="text-xs text-gray-500 font-mono">{entry.agent_id.slice(0, 12)}</span>
              )}
              {(entry.tags ?? []).map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-400">
                  {tag}
                </span>
              ))}
              <span className="text-xs text-gray-600 ml-auto">
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-gray-200 whitespace-pre-wrap">{entry.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
