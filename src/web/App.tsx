import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import Context from "./pages/Context";
import Tasks from "./pages/Tasks";
import Activity from "./pages/Activity";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="agents" element={<Agents />} />
        <Route path="context" element={<Context />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="activity" element={<Activity />} />
      </Route>
    </Routes>
  );
}
