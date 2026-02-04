import { useEffect, useState } from "react";
import { api, type Task, formatDateTime } from "../lib/api";

const COLUMNS = ["pending", "in_progress", "completed"] as const;

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    api.tasks().then(setTasks);
  }, []);

  const byStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tasks</h2>

      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <div key={col}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              {col.replace("_", " ")}
              <span className="bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">
                {byStatus(col).length}
              </span>
            </h3>
            <div className="space-y-2">
              {byStatus(col).map((task) => (
                <div key={task.id} className="bg-gray-900 border border-gray-800 rounded p-3">
                  <div className="text-sm font-medium text-white">{task.title}</div>
                  {task.description && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    {task.assigned_to && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300">
                        {task.assigned_to}
                      </span>
                    )}
                    <span className="ml-auto">{formatDateTime(task.updated_at)}</span>
                  </div>
                </div>
              ))}
              {byStatus(col).length === 0 && (
                <p className="text-gray-700 text-xs text-center py-4">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
