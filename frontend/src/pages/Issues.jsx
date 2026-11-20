
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, Bug, Pencil, Trash2, X,
  CheckCircle, ClipboardList, LayoutGrid, List, MessageSquare
} from "lucide-react";
import api from "../services/api";
import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable
} from "@dnd-kit/core";

const emptyForm = {
  title: "",
  description: "",
  issue_type: "bug",
  priority: "medium",
  project_id: "",
  assignee_id: "",
  deadline: ""
};

// Draggable issue card
function KanbanCard({
  issue,
  onEdit,
  onDelete,
  onComments,
  assigneeNames,
  canDrag,
  canEdit,
  canDelete
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: `issue-${issue.id}`,
    disabled: !canDrag
  });

  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
    }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      className={`mb-3 rounded-xl border bg-white p-4 shadow-sm ${canDrag ? "cursor-grab" : "cursor-default"
        } ${isDragging ? "opacity-50" : ""}`}
    >
      <h3 className="font-semibold text-slate-800">
        {issue.title}
      </h3>

      <p className="mt-2 text-xs capitalize text-slate-500">
        {issue.issue_type} · {issue.priority}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        Assigned: {issue.assignee_id
          ? assigneeNames[issue.assignee_id] || `User #${issue.assignee_id}`
          : "Unassigned"}
      </p>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onComments(issue)}
          className="text-xs text-green-600"
        >
          Comments
        </button>

        {canEdit && (
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onEdit(issue)}
            className="text-xs text-blue-600"
          >
            Edit
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onDelete(issue.id)}
            className="text-xs text-red-600"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// Kanban status column
function KanbanColumn({
  status,
  title,
  issues,
  onEdit,
  onDelete,
  onComments,
  assigneeNames,
  canDrag,
  canEdit,
  canDelete
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled: !canDrag
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[400px] rounded-xl p-3 ${isOver && canDrag ? "bg-blue-100" : "bg-slate-100"
        }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">{title}</h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs">
          {issues.length}
        </span>
      </div>

      {issues.length === 0 && (
        <p className="py-8 text-center text-xs text-slate-400">
          No issues
        </p>
      )}

      {issues.map(issue => (
        <KanbanCard
          key={issue.id}
          issue={issue}
          onEdit={onEdit}
          onDelete={onDelete}
          onComments={onComments}
          assigneeNames={assigneeNames}
          canDrag={canDrag}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}

function Issues() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [assigneeNames, setAssigneeNames] = useState({});
  const [userRole, setUserRole] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("list");

  // Comments state
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [replyToComment, setReplyToComment] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  // Screenshot upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  const isViewer = userRole === "viewer";
  const isDeveloper = userRole === "developer";
  const isAdmin = userRole === "admin";
  const canChangeStatus = isAdmin || isDeveloper;

  // Load issues and projects
  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/issues/");
      setIssues(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load issues.");
    }

    try {
      const response = await api.get("/projects/");
      const loadedProjects = Array.isArray(response.data)
        ? response.data
        : [];

      setProjects(loadedProjects);

      const memberResponses = await Promise.all(
        loadedProjects.map(project =>
          api.get(`/projects/${project.id}/members`)
            .then(res => res.data)
            .catch(() => [])
        )
      );

      const nameMap = {};

      memberResponses.forEach(members => {
        members.forEach(member => {
          nameMap[member.id] = member.name;
        });
      });

      setAssigneeNames(nameMap);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load projects.");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();

    api.get("/auth/me")
      .then(response => {
        setUserRole(String(response.data.role || "").toLowerCase());
      })
      .catch(err => {
        setError(
          err.response?.data?.detail ||
          "Unable to identify your user role. Please log in again."
        );
      });
  }, []);

  // Load members for selected project
  const loadProjectMembers = async (projectId) => {
    setProjectMembers([]);

    if (!projectId) {
      setLoadingMembers(false);
      return;
    }

    setLoadingMembers(true);

    try {
      const response = await api.get(`/projects/${projectId}/members`);
      setProjectMembers(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      setProjectMembers([]);
      setError(err.response?.data?.detail || "Unable to load project members.");
    } finally {
      setLoadingMembers(false);
    }
  };

  const updateField = (e) => {
    const { name, value } = e.target;

    setForm(previous => ({
      ...previous,
      [name]: value
    }));
  };


  const handleProjectChange = (e) => {
    const projectId = e.target.value;

    setForm(previous => ({
      ...previous,
      project_id: projectId,
      assignee_id: ""
    }));

    setProjectMembers([]);
    setError("");
    loadProjectMembers(projectId);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setProjectMembers([]);
    setLoadingMembers(false);
    setError("");
  };

  // Create or update issue
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.project_id && !editingId) {
      setError("Please select a project.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      ...form,
      project_id: Number(form.project_id),
      assignee_id: form.assignee_id
        ? Number(form.assignee_id)
        : null,
      deadline: form.deadline || null
    };

    try {
      if (editingId) {
        delete payload.project_id;
        await api.put(`/issues/${editingId}`, payload);
        setSuccess("Issue updated successfully!");
      } else {
        await api.post("/issues/", payload);
        setSuccess("Issue created successfully!");
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      setProjectMembers([]);

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to save issue. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Edit issue - Admin only
  const handleEdit = (issue) => {
    if (!isAdmin) return;

    setSuccess("");
    setError("");
    setEditingId(issue.id);

    setForm({
      title: issue.title || "",
      description: issue.description || "",
      issue_type: issue.issue_type || "bug",
      priority: issue.priority || "medium",
      project_id: String(issue.project_id),
      assignee_id: issue.assignee_id
        ? String(issue.assignee_id)
        : "",
      deadline: issue.deadline
        ? issue.deadline.slice(0, 16)
        : ""
    });

    setShowForm(true);
    loadProjectMembers(issue.project_id);
  };

  // Delete issue - Admin only
  const handleDelete = async (id) => {
    if (!isAdmin) return;

    if (!window.confirm("Are you sure you want to delete this issue?")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await api.delete(`/issues/${id}`);
      setSuccess("Issue deleted successfully!");
      await loadData();

      if (selectedIssue?.id === id) {
        setSelectedIssue(null);
        setComments([]);
        setAttachments([]);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to delete issue.");
    }
  };

  // Update issue status - Admin and Developer
  const handleStatusChange = async (id, status) => {
    if (!canChangeStatus) return;

    setError("");
    setSuccess("");

    try {
      await api.patch(`/issues/${id}/status`, { status });
      setSuccess("Issue status updated successfully!");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update issue status.");
    }
  };

  // Handle Kanban drag and drop
  const handleDragEnd = async (event) => {
    if (!canChangeStatus) return;

    const { active, over } = event;

    if (!over) return;

    const issueId = Number(
      String(active.id).replace("issue-", "")
    );

    const newStatus = String(over.id);

    const issue = issues.find(item => item.id === issueId);

    const validStatuses = [
      "todo",
      "in_progress",
      "review",
      "done"
    ];

    if (
      !issue ||
      !validStatuses.includes(newStatus) ||
      issue.status === newStatus
    ) {
      return;
    }

    await handleStatusChange(issueId, newStatus);
  };

  // Load screenshots attached to an issue

  const loadAttachments = async (issueId) => {
    setLoadingAttachments(true);
    setAttachments([]);

    try {
      const response = await api.get(`/issues/${issueId}/attachments`);

      const attachmentList = Array.isArray(response.data)
        ? response.data
        : [];

      const files = await Promise.all(
        attachmentList.map(async (item) => {
          try {
            const imageResponse = await api.get(
              `/issues/${issueId}/attachments/${item.id}`,
              { responseType: "blob" }
            );

            const imageUrl = URL.createObjectURL(imageResponse.data);

            return {
              ...item,
              imageUrl
            };
          } catch (error) {
            console.error(
              `Failed to load screenshot ${item.id}:`,
              error.response?.data || error.message
            );

            return {
              ...item,
              imageUrl: null
            };
          }
        })
      );

      setAttachments(files);
    } catch (err) {
      setAttachments([]);
      setError(
        err.response?.data?.detail || "Unable to load screenshots."
      );
    } finally {
      setLoadingAttachments(false);
    }
  };


  const handleOpenComments = async (issue) => {
    setSelectedIssue(issue);
    setComments([]);
    setAttachments([]);
    setCommentText("");
    setReplyToComment(null);
    setLoadingComments(true);
    setError("");
    setSuccess("");

    // Load comments independently
    try {
      const response = await api.get(`/issues/${issue.id}/comments`);
      setComments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load comments.");
    } finally {
      setLoadingComments(false);
    }

    // Always try to load screenshots
    await loadAttachments(issue.id);
  };



  // Add comment or reply
  const handleAddComment = async (e) => {
    e.preventDefault();

    if (!(commentText || "").trim() || !selectedIssue) return;

    setSavingComment(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        `/issues/${selectedIssue.id}/comments`,
        {
          content: commentText.trim(),
          parent_id: replyToComment?.id ?? null
        }
      );

      setComments(previous => [...previous, response.data]);
      setCommentText("");
      setReplyToComment(null);
      setSuccess(
        replyToComment
          ? "Reply added successfully!"
          : "Comment added successfully!"
      );
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to add comment.");
    } finally {
      setSavingComment(false);
    }
  };

  // Upload screenshot - Viewer only
  const handleUploadScreenshot = async (e) => {
    e.preventDefault();

    if (!isViewer) return;
    if (!selectedFile || !selectedIssue) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Image size must be below 5 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setUploadingScreenshot(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        `/issues/${selectedIssue.id}/attachments`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      setSuccess(response.data.message || "Screenshot uploaded successfully!");
      setSelectedFile(null);
      e.target.reset();
      await loadAttachments(selectedIssue.id);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to upload screenshot.");
    } finally {
      setUploadingScreenshot(false);
    }
  };

  // Search and filters
  const filteredIssues = issues.filter((issue) => {
    const searchText = search.trim().toLowerCase();

    const title = String(issue.title || "").toLowerCase();
    const description = String(issue.description || "").toLowerCase();
    const status = String(issue.status || "").trim().toLowerCase();
    const priority = String(issue.priority || "").trim().toLowerCase();
    const type = String(issue.issue_type || "").trim().toLowerCase();

    const matchesSearch =
      searchText === "" ||
      title.includes(searchText) ||
      description.includes(searchText);

    const matchesStatus =
      statusFilter === "all" ||
      status === statusFilter.toLowerCase();

    const matchesPriority =
      priorityFilter === "all" ||
      priority === priorityFilter.toLowerCase();

    const matchesType =
      typeFilter === "all" ||
      type === typeFilter.toLowerCase();

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesType
    );
  });

  const statusStyle = {
    todo: "bg-slate-100 text-slate-700",
    in_progress: "bg-blue-100 text-blue-700",
    review: "bg-amber-100 text-amber-700",
    done: "bg-green-100 text-green-700"
  };

  const priorityStyle = {
    low: "text-slate-500",
    medium: "text-blue-600",
    high: "text-orange-600",
    critical: "text-red-600"
  };

  const columns = [
    { id: "todo", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "review", title: "Review" },
    { id: "done", title: "Done" }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-white px-5 py-5 md:px-8">
        <div>
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-2 flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft size={16} /> Dashboard
          </button>

          <h1 className="text-2xl font-bold">Issues</h1>
          <p className="text-sm text-slate-500">
            Create, assign and manage project issues
          </p>
        </div>

        {isViewer && (
          <button
            onClick={() => {
              resetForm();
              setSuccess("");
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={18} /> Create Issue
          </button>
        )}
      </header>

      <main className="p-5 md:p-8">
        {/* Role label */}
        <div className="mb-4 text-sm text-slate-500">
          Logged in role: <span className="font-semibold capitalize">{userRole || "Loading..."}</span>
        </div>

        {/* Issue summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">Total Issues</p>
            <p className="mt-2 text-3xl font-bold">{issues.length}</p>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">In Progress</p>
            <p className="mt-2 text-3xl font-bold">
              {issues.filter(i => i.status === "in_progress").length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-bold">
              {issues.filter(i => i.status === "done").length}
            </p>
          </div>
        </div>

        {success && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle size={18} /> {success}
          </div>
        )}

        {error && (
          <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* View toggle */}
        <div className="mb-4 flex justify-end gap-2">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${viewMode === "list" ? "bg-blue-600 text-white" : "border bg-white"
              }`}
          >
            <List size={16} /> List View
          </button>

          <button
            onClick={() => setViewMode("board")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${viewMode === "board" ? "bg-blue-600 text-white" : "border bg-white"
              }`}
          >
            <LayoutGrid size={16} /> Board View
          </button>
        </div>

        {/* Search and filters */}
        <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl border bg-white p-4 md:grid-cols-4">
          <div className="flex items-center gap-2 rounded-lg border px-3">
            <Search size={18} className="text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search issues..."
              className="w-full py-3 outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border px-3 py-3"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="rounded-lg border px-3 py-3"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="rounded-lg border px-3 py-3"
          >
            <option value="all">All Types</option>
            <option value="bug">Bug</option>
            <option value="task">Task</option>
            <option value="feature">Feature Request</option>
          </select>
        </div>

        {/* Create / Edit Issue form */}
        {showForm && (
          <div className="mb-7 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingId ? "Edit Issue" : "Create New Issue"}
              </h2>

              <button type="button" onClick={resetForm}>
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  required
                  maxLength={200}
                  placeholder="Enter issue title"
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  rows={3}
                  placeholder="Describe the issue..."
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Project</label>
                <select
                  name="project_id"
                  value={form.project_id}
                  onChange={handleProjectChange}
                  required
                  disabled={Boolean(editingId)}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="">Select project</option>
                  {projects.map(project => (
                    <option key={project.id} value={String(project.id)}>
                      {project.name}
                    </option>
                  ))}
                </select>

                {projects.length === 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    No projects loaded. Check your project access.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Issue Type</label>
                <select
                  name="issue_type"
                  value={form.issue_type}
                  onChange={updateField}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="bug">Bug</option>
                  <option value="task">Task</option>
                  <option value="feature">Feature Request</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Priority</label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={updateField}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {isAdmin && editingId && (
                <div>
                  <label className="mb-2 block text-sm font-medium">Assign To</label>

                  <select
                    name="assignee_id"
                    value={form.assignee_id}
                    onChange={updateField}
                    disabled={!form.project_id || loadingMembers}
                    className="w-full rounded-lg border px-4 py-3 disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingMembers
                        ? "Loading members..."
                        : !form.project_id
                          ? "Select a project first"
                          : "Unassigned"}
                    </option>

                    {projectMembers
                      .filter(member => member.role === "developer")
                      .map(member => (
                        <option key={member.id} value={String(member.id)}>
                          {member.name} ({member.role})
                        </option>
                      ))}
                  </select>

                  <p className="mt-1 text-xs text-slate-500">
                    {loadingMembers
                      ? "Loading project members..."
                      : "Select a developer to assign this issue."}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium">Deadline</label>
                <input
                  name="deadline"
                  type="datetime-local"
                  value={form.deadline}
                  onChange={updateField}
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div className="flex items-end gap-3">
                <button
                  disabled={saving || projects.length === 0}
                  className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Issue"
                      : "Create Issue"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border px-5 py-3"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Comments Panel */}
        {selectedIssue && (
          <div className="mb-7 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Issue Comments</h2>
                <p className="text-sm text-slate-500">
                  {selectedIssue.title} · Issue #{selectedIssue.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedIssue(null);
                  setComments([]);
                  setCommentText("");
                  setAttachments([]);
                  setReplyToComment(null);
                  setError("");
                  setSuccess("");
                }}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {loadingComments ? (
              <p className="py-6 text-center text-slate-500">
                Loading comments...
              </p>
            ) : comments.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No comments yet. Start the discussion.
              </p>
            ) : (
              <div className="mb-5 max-h-64 space-y-3 overflow-y-auto">
                {comments
                  .filter(comment => !comment.parent_id)
                  .map(comment => (
                    <div
                      key={comment.id}
                      className="rounded-lg border bg-slate-50 p-4"
                    >
                      <p className="text-sm font-semibold text-slate-700">
                        {assigneeNames[comment.author_id] ||
                          comment.author?.name ||
                          `User #${comment.author_id}`}
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                        {comment.content}
                      </p>

                      {comment.created_at && (
                        <p className="mt-2 text-xs text-slate-400">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      )}

                      {!isViewer && (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyToComment(comment);
                            setCommentText("");
                          }}
                          className="mt-2 text-xs font-semibold text-blue-600"
                        >
                          Reply
                        </button>
                      )}

                      {comments
                        .filter(reply => reply.parent_id === comment.id)
                        .map(reply => (
                          <div
                            key={reply.id}
                            className="ml-5 mt-3 rounded-lg border-l-4 border-blue-300 bg-white p-3"
                          >
                            <p className="text-sm font-semibold text-slate-700">
                              {assigneeNames[reply.author_id] ||
                                reply.author?.name ||
                                `User #${reply.author_id}`}
                            </p>

                            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                              {reply.content}
                            </p>

                            {reply.created_at && (
                              <p className="mt-2 text-xs text-slate-400">
                                {new Date(reply.created_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  ))}
              </div>
            )}


            {/* Uploaded Screenshots */}
            < div className="mb-6 rounded-xl border bg-white p-4">
              <h3 className="mb-3 font-semibold text-slate-700">
                Uploaded Screenshots ({attachments.length})
              </h3>

              {loadingAttachments ? (
                <p>Loading screenshots...</p>
              ) : attachments.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No screenshots uploaded yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {attachments.map(item => (
                    <div key={item.id} className="rounded-lg border p-2">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.filename}
                          onError={() =>
                            console.error("Image display failed:", item.filename, item.imageUrl)
                          }
                          className="h-36 w-full rounded-lg object-contain bg-slate-100"
                        />
                      ) : (
                        <p className="flex h-36 items-center justify-center text-xs text-red-500">
                          Image could not be loaded
                        </p>
                      )}

                      <p className="mt-2 truncate text-xs text-slate-500">
                        {item.filename}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Screenshot Upload - Viewer only */}
            {isViewer && (
              <div className="mb-6 rounded-xl border border-dashed border-blue-300 bg-blue-50 p-4">
                <h3 className="mb-3 font-semibold text-slate-700">
                  Upload Issue Screenshot
                </h3>

                <form onSubmit={handleUploadScreenshot}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="mb-3 block w-full text-sm"
                  />

                  <p className="mb-3 text-xs text-slate-500">
                    JPG, PNG or WEBP · Maximum size 5 MB
                  </p>

                  <button
                    type="submit"
                    disabled={!selectedFile || uploadingScreenshot}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {uploadingScreenshot ? "Uploading..." : "Upload Screenshot"}
                  </button>
                </form>
              </div>
            )}

            {/* Add Comment / Reply */}
            <form onSubmit={handleAddComment}>
              <label className="mb-2 block text-sm font-medium">
                {replyToComment
                  ? `Replying to comment #${replyToComment.id}`
                  : "Add a comment"}
              </label>

              {replyToComment && (
                <button
                  type="button"
                  onClick={() => {
                    setReplyToComment(null);
                    setCommentText("");
                  }}
                  className="mb-2 text-xs text-red-600"
                >
                  Cancel Reply
                </button>
              )}

              <textarea
                value={commentText ?? ""}
                onChange={e => setCommentText(e.target.value)}
                rows={3}
                placeholder="Write your comment..."
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
              />

              <button
                type="submit"
                disabled={savingComment || !(commentText || "").trim()}
                className="mt-3 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
              >
                {savingComment ? "Posting..." : "Post Comment"}
              </button>
            </form>
          </div>
        )
        }

        {/* Loading */}
        {
          loading ? (
            <p className="py-12 text-center text-slate-500">
              Loading issues...
            </p>
          ) : viewMode === "board" ? (
            /* Kanban Board */
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {columns.map(column => (
                  <KanbanColumn
                    key={column.id}
                    status={column.id}
                    title={column.title}
                    issues={filteredIssues.filter(
                      issue => issue.status === column.id
                    )}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onComments={handleOpenComments}
                    assigneeNames={assigneeNames}
                    canDrag={canChangeStatus}
                    canEdit={isAdmin}
                    canDelete={isAdmin}
                  />
                ))}
              </div>
            </DndContext>
          ) : filteredIssues.length === 0 ? (
            /* Empty List */
            <div className="rounded-2xl border bg-white py-16 text-center">
              <ClipboardList
                size={45}
                className="mx-auto mb-4 text-slate-300"
              />
              <h3 className="font-bold">No issues found</h3>
              <p className="mt-2 text-sm text-slate-500">
                Create an issue or change your search filters.
              </p>
            </div>
          ) : (
            /* List View */
            <div className="overflow-x-auto rounded-2xl border bg-white">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4">Issue</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Assignee</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredIssues.map(issue => (
                    <tr key={issue.id} className="border-t hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-2 font-semibold">
                          <Bug size={17} className="text-blue-600" />
                          {issue.title}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Issue #{issue.id} · Project #{issue.project_id}
                        </p>
                      </td>

                      <td className="p-4 capitalize">
                        {issue.issue_type}
                      </td>

                      <td
                        className={`p-4 font-semibold capitalize ${priorityStyle[issue.priority] || ""
                          }`}
                      >
                        {issue.priority}
                      </td>

                      <td className="p-4">
                        {issue.assignee_id
                          ? assigneeNames[issue.assignee_id] || `User #${issue.assignee_id}`
                          : "Unassigned"}
                      </td>

                      <td className="p-4">
                        {canChangeStatus ? (
                          <select
                            value={issue.status}
                            onChange={e =>
                              handleStatusChange(issue.id, e.target.value)
                            }
                            className={`rounded-lg px-2 py-2 text-xs font-semibold ${statusStyle[issue.status] || ""
                              }`}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                          </select>
                        ) : (
                          <span
                            className={`rounded-lg px-2 py-2 text-xs font-semibold ${statusStyle[issue.status] || ""
                              }`}
                          >
                            {String(issue.status || "").replace("_", " ")}
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenComments(issue)}
                            title="View comments"
                            className="rounded-lg p-2 text-slate-500 hover:bg-green-50 hover:text-green-600"
                          >
                            <MessageSquare size={17} />
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleEdit(issue)}
                                title="Edit issue"
                                className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Pencil size={17} />
                              </button>

                              <button
                                onClick={() => handleDelete(issue.id)}
                                title="Delete issue"
                                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={17} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </main >
    </div >
  );
}

export default Issues;