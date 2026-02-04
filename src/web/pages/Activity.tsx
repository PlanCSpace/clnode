import { useEffect, useState } from "react";
import { api, type Activity as ActivityType, type FileChange, formatTime } from "../lib/api";
import { useWebSocket } from "../lib/useWebSocket";

const EVENT_TYPES = [
  "SessionStart", "SessionEnd", "SubagentStart", "SubagentStop",
  "PostToolUse", "Stop", "UserPromptSubmit",
];

export default function Activity() {
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [files, setFiles] = useState<FileChange[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [subagentOnly, setSubagentOnly] = useState(false);
  const [tab, setTab] = useState<"log" | "files">("log");
  const { events, connected } = useWebSocket();

  useEffect(() => {
    api.activities(100).then(setActivities);
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      api.activities(100).then(setActivities);
    }
  }, [events.length]);

  const loadFiles = (sessionId: string) => {
    api.sessionFiles(sessionId).then(setFiles);
  };

  const filtered = activities
    .filter((a) => !typeFilter || a.event_type === typeFilter)
    .filter((a) => !subagentOnly || a.agent_id != null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold">Activity</h2>
        <span className={`text-xs px-2 py-0.5 rounded ${connected ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
          {connected ? "LIVE" : "OFFLINE"}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("log")}
          className={`px-3 py-1 rounded text-xs ${tab === "log" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"}`}
        >
          Event Log
        </button>
        <button
          onClick={() => setTab("files")}
          className={`px-3 py-1 rounded text-xs ${tab === "files" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"}`}
        >
          File Changes
        </button>
        {tab === "log" && (
          <>
            <button
              onClick={() => setSubagentOnly(!subagentOnly)}
              className={`px-3 py-1 rounded text-xs ml-auto ${subagentOnly ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400"}`}
            >
              Subagent Only
            </button>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
            >
              <option value="">All events</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {tab === "log" && (
        <div className="space-y-1">
          {filtered.length === 0 && <p className="text-gray-600 text-sm">No activity</p>}
          {filtered.map((a) => {
            let details: Record<string, unknown> = {};
            try { details = JSON.parse(a.details); } catch { /* ignore */ }
            return (
              <div key={a.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-gray-900">
                <span className="text-gray-600 w-20 shrink-0">
                  {formatTime(a.created_at)}
                </span>
                <EventBadge type={a.event_type} />
                <span className="text-gray-400 font-mono w-20 shrink-0">
                  {a.agent_id?.slice(0, 10) ?? "—"}
                </span>
                <span className="text-gray-500 truncate">
                  {Object.entries(details).map(([k, v]) => `${k}=${String(v)}`).join(" ")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tab === "files" && (
        <div>
          <div className="mb-3">
            <button
              onClick={() => {
                if (activities.length > 0) loadFiles(activities[0].session_id);
              }}
              className="px-3 py-1 rounded text-xs bg-gray-800 text-gray-400 hover:bg-gray-700"
            >
              Load latest session files
            </button>
          </div>
          <div className="space-y-1">
            {files.length === 0 && <p className="text-gray-600 text-sm">No file changes loaded</p>}
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-gray-900">
                <span className="text-gray-600 w-20 shrink-0">
                  {formatTime(f.created_at)}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  f.change_type === "create" ? "bg-green-900 text-green-300" : "bg-yellow-900 text-yellow-300"
                }`}>
                  {f.change_type}
                </span>
                <span className="text-gray-300 font-mono">{f.file_path}</span>
                <span className="text-gray-500 font-mono">{f.agent_id?.slice(0, 10) ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    SessionStart: "bg-green-900 text-green-300",
    SessionEnd: "bg-red-900 text-red-300",
    SubagentStart: "bg-blue-900 text-blue-300",
    SubagentStop: "bg-purple-900 text-purple-300",
    PostToolUse: "bg-yellow-900 text-yellow-300",
    UserPromptSubmit: "bg-cyan-900 text-cyan-300",
    Stop: "bg-orange-900 text-orange-300",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium w-28 text-center shrink-0 ${colors[type] ?? "bg-gray-800 text-gray-400"}`}>
      {type}
    </span>
  );
}
