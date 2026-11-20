
import { useEffect, useState } from "react";
import {
  LayoutDashboard, FolderKanban, Bug, Users, Settings,
  LogOut, Plus, Clock, CheckCircle, AlertCircle,
  ArrowUpRight, Bell, ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { logoutUser } from "../services/auth";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const role = user?.role?.toLowerCase();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [userRes, projectRes, issueRes] = await Promise.all([
          api.get("/auth/me"),
          api.get("/projects/"),
          api.get("/issues/")
        ]);

        setUser(userRes.data);
        setProjects(projectRes.data);
        setIssues(issueRes.data);
      } catch {
        setError("Unable to load dashboard data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const todo = issues.filter(i => i.status === "todo").length;
  const progress = issues.filter(i => i.status === "in_progress").length;
  const review = issues.filter(i => i.status === "review").length;
  const completed = issues.filter(i => i.status === "done").length;
  const critical = issues.filter(i => i.priority === "critical").length;
  const high = issues.filter(i => i.priority === "high").length;
  const medium = issues.filter(i => i.priority === "medium").length;
  const low = issues.filter(i => i.priority === "low").length;

  const handleLogout = () => {
    logoutUser();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading your workspace...
      </div>
    );
  }

  if (error) {
    return <div className="p-10 text-center text-red-600">{error}</div>;
  }

  const statCards = [
    { label: "Total Issues", value: issues.length, icon: Bug, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "In Progress", value: progress, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Completed", value: completed, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Critical Issues", value: critical, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" }
  ];

  const priorityItems = [
    { name: "Critical", count: critical, color: "bg-red-500" },
    { name: "High", count: high, color: "bg-orange-500" },
    { name: "Medium", count: medium, color: "bg-amber-400" },
    { name: "Low", count: low, color: "bg-emerald-500" }
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">

      {/* SIDEBAR */}
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 px-5 py-7 text-white lg:flex">

        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="rounded-xl bg-blue-600 p-2">
            <Bug size={23} />
          </div>
          <span className="text-xl font-bold tracking-tight">BugTracker</span>
        </div>

        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Workspace
        </p>

        <nav className="space-y-2">

          <div className="flex items-center gap-3 rounded-xl bg-blue-600 px-4 py-3 font-medium">
            <LayoutDashboard size={19} /> Dashboard
          </div>

          <button
            onClick={() => navigate("/projects")}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800"
          >
            <FolderKanban size={19} /> Projects
          </button>

          {role === "viewer" && (
            <>
              <button
                onClick={() => navigate("/issues")}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800"
              >
                <Bug size={19} /> Report Bug
              </button>

              <button
                onClick={() => navigate("/issues?view=my-reports")}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800"
              >
                <CheckCircle size={19} /> My Reports
              </button>
            </>
          )}

          {role !== "viewer" && (
            <button
              onClick={() => navigate("/issues")}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800"
            >
              <Bug size={19} /> Issues
            </button>
          )}

          {role === "admin" && (
            <button
              onClick={() => navigate("/team")}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800"
            >
              <Users size={19} /> Team
            </button>
          )}

        </nav>

        <p className="mb-3 mt-9 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Preferences
        </p>

        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300">
          <Settings size={19} /> Settings
        </div>

        <div className="mt-auto border-t border-slate-800 pt-5">

          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="text-xs capitalize text-slate-400">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-300 hover:bg-slate-800"
          >
            <LogOut size={18} /> Sign out
          </button>

        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1">

        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-sm text-slate-500">
              Your project workspace at a glance
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50">
              <Bell size={19} />
            </button>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 lg:hidden"
            >
              Sign out
            </button>

            <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 sm:flex">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        <div className="space-y-7 p-5 md:p-8">

          {/* WELCOME */}
          <section className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                Welcome back, {user?.name}!
              </h2>
              <p className="mt-1 text-slate-500">
                Here is what's happening with your projects today.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">

              {role === "admin" && (
                <button
                  onClick={() => navigate("/projects")}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  <Plus size={18} /> New Project
                </button>
              )}

              {role === "viewer" && (
                <button
                  onClick={() => navigate("/issues")}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  <Plus size={18} /> Report Bug
                </button>
              )}

              {role !== "viewer" && (
                <button
                  onClick={() => navigate("/issues")}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50"
                >
                  <Plus size={18} /> View Issues
                </button>
              )}

            </div>
          </section>

          {/* STATISTICS */}
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map(stat => {
              const Icon = stat.icon;

              return (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">{stat.label}</span>
                    <span className={`rounded-xl p-3 ${stat.bg} ${stat.color}`}>
                      <Icon size={21} />
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-xs text-slate-400">Across your workspace</p>
                </div>
              );
            })}
          </section>

          {/* RECENT ISSUES */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">

            <div className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">
                    {role === "viewer" ? "My Recent Reports" : "Recent Issues"}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Latest issues in your projects
                  </p>
                </div>

                <button
                  onClick={() => navigate("/issues")}
                  className="flex items-center gap-1 text-sm font-semibold text-blue-600"
                >
                  View all <ChevronRight size={16} />
                </button>
              </div>

              {issues.length === 0 ? (
                <div className="py-10 text-center">
                  <Bug className="mx-auto mb-3 text-slate-300" size={35} />
                  <p className="font-semibold">No issues yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {role === "viewer"
                      ? "Report a bug to start tracking it."
                      : "No issues found in your workspace."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b text-xs uppercase text-slate-400">
                      <tr>
                        <th className="pb-3">Issue</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Priority</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {issues.slice(0, 7).map(issue => (
                        <tr key={issue.id} className="border-b last:border-0">
                          <td className="py-4 pr-4">
                            <p className="font-semibold">{issue.title}</p>
                            <p className="text-xs text-slate-400">ISSUE-{issue.id}</p>
                          </td>
                          <td className="py-4 capitalize text-slate-500">{issue.issue_type}</td>
                          <td className="py-4 capitalize">{issue.priority}</td>
                          <td className="py-4">
                            <span className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs capitalize">
                              {issue.status.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* PRIORITY */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold">Priority Breakdown</h3>
              <p className="mb-6 text-sm text-slate-500">Issues by priority level</p>

              <div className="space-y-5">
                {priorityItems.map(item => (
                  <div key={item.name}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-slate-500">{item.count}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{
                          width: `${issues.length ? item.count / issues.length * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold">Total tracked issues</p>
                <p className="mt-1 text-2xl font-bold">{issues.length}</p>
              </div>
            </div>
          </section>

          {/* PROJECTS AND WORKFLOW */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Project Overview</h3>
                  <p className="text-sm text-slate-500">Projects you belong to</p>
                </div>

                <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                  {projects.length} Projects
                </span>
              </div>

              {projects.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No projects found.
                </p>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 5).map(project => (
                    <button
                      key={project.id}
                      onClick={() => navigate(`/issues?project_id=${project.id}`)}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50"
                    >
                      <div className="rounded-lg bg-indigo-50 p-3 text-indigo-600">
                        <FolderKanban size={20} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{project.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {project.description || "No description"}
                        </p>
                      </div>

                      <ArrowUpRight size={18} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold">Workflow Summary</h3>
              <p className="mb-6 text-sm text-slate-500">
                Current status of all issues
              </p>

              {[
                { name: "To Do", count: todo, color: "bg-blue-500" },
                { name: "In Progress", count: progress, color: "bg-amber-500" },
                { name: "In Review", count: review, color: "bg-violet-500" },
                { name: "Done", count: completed, color: "bg-emerald-500" }
              ].map(item => (
                <div key={item.name} className="mb-5">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{
                        width: `${issues.length ? item.count / issues.length * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

          </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
