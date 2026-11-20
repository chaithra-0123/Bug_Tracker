
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban, Plus, Search, ArrowLeft, X,
  Trash2, Pencil, FolderOpen, CheckCircle,
  ArrowUpRight, BriefcaseBusiness, Layers3
} from "lucide-react";
import api from "../services/api";

function Projects() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [userRole, setUserRole] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();
  const isAdmin = userRole === "admin";

  const loadProjects = async () => {
    try {
      const response = await api.get("/projects/");
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const response = await api.get("/auth/me");
        setUserRole(String(response.data.role || "").toLowerCase());
      } catch {
        setError("Unable to identify your role. Please log in again.");
      }

      await loadProjects();
    };

    initialize();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingId) {
        await api.put(`/projects/${editingId}`, { name, description });
        setSuccess("Project updated successfully!");
      } else {
        await api.post("/projects/", { name, description });
        setSuccess("Project created successfully!");
      }

      resetForm();
      await loadProjects();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to save project. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (project) => {
    if (!isAdmin) return;

    setSuccess("");
    setError("");
    setEditingId(project.id);
    setName(project.name);
    setDescription(project.description || "");
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return;

    if (!window.confirm("Are you sure you want to delete this project?")) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/projects/${id}`);
      setSuccess("Project deleted successfully!");
      await loadProjects();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to delete project.");
    }
  };

  const openProject = (project) => {
    navigate(`/issues?project_id=${project.id}`);
  };

  const filteredProjects = projects.filter(project =>
    String(project.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="projects-page">
      <header className="projects-header">
        <div className="projects-heading">
          <button
            onClick={() => navigate("/dashboard")}
            className="projects-back"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>

          <div className="projects-title-row">
            <div className="projects-title-icon">
              <FolderKanban size={25} />
            </div>
            <div>
              <h1>Projects</h1>
              <p>
                {isAdmin
                  ? "Organize work, manage projects and keep your team moving."
                  : "Explore your projects and manage your assigned work."}
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setSuccess("");
              setShowForm(true);
            }}
            className="projects-primary-btn"
          >
            <Plus size={18} />
            Create Project
          </button>
        )}
      </header>

      <main className="projects-content">
        <div className="projects-welcome">
          <div>
            <span className="projects-eyebrow">WORKSPACE OVERVIEW</span>
            <h2>Your project workspace</h2>
            <p>Everything your team is working on, in one place.</p>
          </div>
          <span className="projects-role">
            <span className="projects-role-dot" />
            {userRole || "Loading role..."}
          </span>
        </div>

        <section className="projects-stats">
          <div className="projects-stat-card">
            <div className="projects-stat-icon">
              <BriefcaseBusiness size={21} />
            </div>
            <div>
              <span>Total projects</span>
              <strong>{projects.length}</strong>
              <small>Available in your workspace</small>
            </div>
          </div>

          <div className="projects-stat-card">
            <div className="projects-stat-icon projects-stat-icon-alt">
              <Layers3 size={21} />
            </div>
            <div>
              <span>Matching projects</span>
              <strong>{filteredProjects.length}</strong>
              <small>Based on your search</small>
            </div>
          </div>
        </section>

        <section className="projects-toolbar">
          <div>
            <h3>All projects</h3>
            <p>Browse and open a project to view its issues.</p>
          </div>

          <div className="projects-search">
            <Search size={19} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
            />
            {search && (
              <button onClick={() => setSearch("")} title="Clear search">
                <X size={17} />
              </button>
            )}
          </div>
        </section>

        {success && (
          <div className="projects-alert projects-success">
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        {error && (
          <div className="projects-alert projects-error">
            {error}
          </div>
        )}

        {showForm && isAdmin && (
          <section className="projects-form-card">
            <div className="projects-form-heading">
              <div>
                <span className="projects-eyebrow">
                  {editingId ? "UPDATE WORKSPACE" : "NEW WORKSPACE"}
                </span>
                <h3>{editingId ? "Edit project" : "Create a project"}</h3>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="projects-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="projects-form">
              <div className="projects-field">
                <label>Project name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="Example: Bug Tracker"
                />
              </div>

              <div className="projects-field">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What is this project about?"
                />
              </div>

              <div className="projects-form-actions">
                <button
                  disabled={saving}
                  className="projects-primary-btn"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create project"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="projects-cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="projects-grid-section">
          {loading ? (
            <div className="projects-empty">
              <div className="projects-loading" />
              <h3>Loading projects</h3>
              <p>Please wait while we fetch your workspace.</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="projects-empty">
              <div className="projects-empty-icon">
                <FolderOpen size={34} />
              </div>
              <h3>No projects found</h3>
              <p>
                {search
                  ? "Try another search term."
                  : isAdmin
                    ? "Create your first project to get started."
                    : "No projects are available to you yet."}
              </p>
              {isAdmin && !search && (
                <button
                  onClick={() => setShowForm(true)}
                  className="projects-primary-btn"
                >
                  <Plus size={17} /> Create your first project
                </button>
              )}
            </div>
          ) : (
            <div className="projects-grid">
              {filteredProjects.map((project, index) => (
                <article
                  key={project.id}
                  className="project-card"
                  onClick={() => openProject(project)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openProject(project);
                    }
                  }}
                >
                  <div className="project-card-top">
                    <div className={`project-card-icon project-icon-${index % 4}`}>
                      <FolderKanban size={23} />
                    </div>

                    {isAdmin && (
                      <div className="project-card-actions">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleEdit(project);
                          }}
                          title="Edit project"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(project.id);
                          }}
                          title="Delete project"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="project-card-info">
                    <span className="project-card-label">
                      PROJECT #{project.id}
                    </span>
                    <h3>{project.name}</h3>
                    <p>
                      {project.description || "No description provided yet."}
                    </p>
                  </div>

                  <div className="project-card-footer">
                    <span>View project issues</span>
                    <span className="project-open-icon">
                      <ArrowUpRight size={18} />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Projects;
