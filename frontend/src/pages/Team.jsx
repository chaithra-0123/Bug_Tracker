
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  Users,
  UserPlus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from "lucide-react";

function Team() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const response = await api.get("/auth/me");
        const role = String(response.data.role || "").toLowerCase();

        if (role !== "admin") {
          navigate("/dashboard", { replace: true });
          return;
        }

        setIsAdmin(true);
        await loadProjects();
      } catch {
        navigate("/login", { replace: true });
      } finally {
        setCheckingRole(false);
      }
    };

    initialize();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.get("/projects/");
      const projectList = Array.isArray(response.data) ? response.data : [];

      setProjects(projectList);

      if (projectList.length > 0) {
        setSelectedProject(String(projectList[0].id));
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load projects.");
    }
  };

  const loadUsers = async () => {
    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const response = await api.get("/projects/users/");
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load users. Admin access is required."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}/members`);
      setMembers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setMembers([]);
      setError(err.response?.data?.detail || "Unable to load project members.");
    }
  };

  useEffect(() => {
    if (selectedProject && isAdmin) {
      loadMembers(selectedProject);
    } else {
      setMembers([]);
    }
  }, [selectedProject, isAdmin]);

  const addMember = async () => {
    if (!selectedProject || !selectedUser) {
      setError("Please select a project and a user.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.post(
        `/projects/${selectedProject}/members/${selectedUser}`
      );

      setSuccess("Team member added successfully!");
      setSelectedUser("");
      await loadMembers(selectedProject);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to add team member.");
    }
  };

  if (checkingRole) {
    return (
      <div className="p-10 text-center text-slate-500">
        Checking permissions...
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">

        <button
          onClick={() => navigate("/dashboard")}
          className="mb-5 flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft size={16} /> Dashboard
        </button>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Team Management
            </h1>
            <p className="mt-2 text-slate-500">
              Add users and manage project team members.
            </p>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw size={18} />
            {loading ? "Loading..." : "Load Users"}
          </button>
        </div>

        {success && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle size={18} /> {success}
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div className="mb-8 grid gap-6 md:grid-cols-2">

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <UserPlus className="text-indigo-600" size={24} />
              <h2 className="text-xl font-semibold">
                Add Team Member
              </h2>
            </div>

            <label className="mb-2 block text-sm font-medium">
              Select Project
            </label>

            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="mb-5 w-full rounded-xl border p-3"
            >
              <option value="">Select a project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <label className="mb-2 block text-sm font-medium">
              Select User
            </label>

            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="mb-5 w-full rounded-xl border p-3"
            >
              <option value="">Select a user</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email}) - {user.role}
                </option>
              ))}
            </select>

            <button
              onClick={addMember}
              disabled={!selectedProject || !selectedUser}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Add to Project
            </button>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Users className="text-indigo-600" size={24} />
              <h2 className="text-xl font-semibold">
                Project Members
              </h2>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              Members of the selected project
            </p>

            {members.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-5 text-center text-slate-500">
                No project members found.
              </p>
            ) : (
              <div className="space-y-3">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-xl border p-4"
                  >
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-slate-500">
                        {member.email}
                      </p>
                    </div>

                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium capitalize text-indigo-700">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Registered Users
          </h2>

          {users.length === 0 ? (
            <p className="text-slate-500">
              Click Load Users to view registered users.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-sm text-slate-500">
                    <th className="p-3">User ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b text-sm">
                      <td className="p-3">{user.id}</td>
                      <td className="p-3 font-medium">{user.name}</td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3 capitalize">{user.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Team;
