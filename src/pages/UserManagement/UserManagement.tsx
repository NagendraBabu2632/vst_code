import "./UserManagement.css";
import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import {
  fetchUsers,
  createUser,
  editUser,
  deactivateUser,
  resetUserPassword,
  selectUsers,
  selectUsersLoading,
  type UserApiItem,
} from "@/redux/slices/userManagementSlice";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Search, UserPlus, ChevronLeft, ChevronRight, Key, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 10;

type ModalMode = "add" | "edit" | null;

interface UserForm {
  username: string;
  email: string;
  designation: string;
  role: "Manager" | "Operator";
  isActive: boolean;
}

const emptyForm = (): UserForm => ({
  username: "",
  email: "",
  designation: "",
  role: "Operator",
  isActive: true,
});

const UserManagement = () => {
  const dispatch = useAppDispatch();
  const users   = useAppSelector(selectUsers);
  const loading = useAppSelector(selectUsersLoading);

  const [search, setSearch]               = useState("");
  const [page, setPage]                   = useState(1);
  const [modalMode, setModalMode]         = useState<ModalMode>(null);
  const [editingUser, setEditingUser]     = useState<UserApiItem | null>(null);
  const [form, setForm]                   = useState<UserForm>(emptyForm());
  const [deactivateTarget, setDeactivateTarget] = useState<UserApiItem | null>(null);
  const [saving, setSaving]               = useState(false);
  const [deactivating, setDeactivating]   = useState(false);
  const [passwordInfo, setPasswordInfo]   = useState<{ title: string; username: string; password: string } | null>(null);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        String(u.userId).includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.designation.toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); };

  const openAdd = () => { setForm(emptyForm()); setEditingUser(null); setModalMode("add"); };

  const openEdit = (user: UserApiItem) => {
    setForm({
      username:    user.username,
      email:       user.email,
      designation: user.designation,
      role:        user.role,
      isActive:    user.isActive,
    });
    setEditingUser(user);
    setModalMode("edit");
  };

  const closeModal = () => { setModalMode(null); setEditingUser(null); };

  const handleSave = async () => {
    if (!form.username.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      if (modalMode === "add") {
        const result = await dispatch(createUser({
          username:    form.username.trim(),
          email:       form.email.trim(),
          designation: form.designation.trim() || undefined,
          role:        form.role,
        })).unwrap();
        closeModal();
        dispatch(fetchUsers());
        setPasswordInfo({ title: "User Created", username: form.username.trim(), password: result.defaultPassword });
      } else if (modalMode === "edit" && editingUser) {
        await dispatch(editUser({
          id:      editingUser.userId,
          payload: {
            username:    form.username.trim(),
            email:       form.email.trim(),
            designation: form.designation.trim() || undefined,
            role:        form.role,
            isActive:    form.isActive,
          },
        })).unwrap();
        closeModal();
        toast.success("User updated successfully.");
      }
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : "Operation failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await dispatch(deactivateUser(deactivateTarget.userId)).unwrap();
      toast.success(`${deactivateTarget.username} has been deactivated.`);
      setDeactivateTarget(null);
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : "Failed to deactivate user.");
    } finally {
      setDeactivating(false);
    }
  };

  const handleResetPassword = async (user: UserApiItem) => {
    try {
      const result = await dispatch(resetUserPassword(user.userId)).unwrap();
      setPasswordInfo({ title: "Password Reset", username: user.username, password: result.defaultPassword });
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : "Failed to reset password.");
    }
  };

  const handleCopyPassword = (password: string) => {
    navigator.clipboard.writeText(password).then(
      () => toast.success("Password copied to clipboard."),
      () => toast.error("Could not copy to clipboard.")
    );
  };

  const field =
    (key: keyof UserForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({
        ...prev,
        [key]: key === "isActive" ? e.target.value === "true" : e.target.value,
      }));

  const isFormValid = form.username.trim() && form.email.trim();

  return (
    <DashboardLayout>
      <div className="um-page">

        {/* Header */}
        <div className="um-header">
          <h2 className="um-title">User Management</h2>
          <div className="um-toolbar">
            <div className="um-search-wrap">
              <Search className="um-search-icon" aria-hidden="true" />
              <input
                id="um-search"
                className="um-search"
                type="text"
                placeholder="Search users…"
                aria-label="Search users"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <button type="button" className="um-btn-add" onClick={openAdd}>
              <UserPlus size={15} aria-hidden="true" />
              Add New User
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="um-card">
          <div className="um-table-wrap">
            <table className="um-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Designation</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="um-loading-row">
                        <Loader2 size={16} className="animate-spin" />
                        Loading users…
                      </div>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="um-empty">No users found.</div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((user) => (
                    <tr key={user.userId}>
                      <td>{user.userId}</td>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.designation || "—"}</td>
                      <td>
                        <span className={`um-badge ${user.role === "Manager" ? "um-badge--manager" : "um-badge--operator"}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`um-badge ${user.isActive ? "um-badge--yes" : "um-badge--no"}`}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="um-mono">{user.lastLoggedIn}</td>
                      <td>{user.createdAt}</td>
                      <td>
                        <div className="um-actions">
                          <button
                            type="button"
                            className="um-icon-btn um-icon-btn--edit"
                            aria-label={`Edit ${user.username}`}
                            title="Edit user"
                            onClick={() => openEdit(user)}
                          >
                            <Pencil size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="um-icon-btn um-icon-btn--reset"
                            aria-label={`Reset password for ${user.username}`}
                            title="Reset to default password"
                            onClick={() => handleResetPassword(user)}
                          >
                            <Key size={13} aria-hidden="true" />
                          </button>
                          {user.isActive && (
                            <button
                              type="button"
                              className="um-icon-btn um-icon-btn--delete"
                              aria-label={`Deactivate ${user.username}`}
                              title="Deactivate user"
                              onClick={() => setDeactivateTarget(user)}
                            >
                              <Trash2 size={13} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="um-pagination">
            <span>
              Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} users
            </span>
            <div className="um-page-btns">
              <button
                type="button"
                className="um-page-btn"
                aria-label="Previous page"
                disabled={safePage === 1}
                onClick={() => setPage(safePage - 1)}
              >
                <ChevronLeft size={13} aria-hidden="true" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-label={`Page ${p}`}
                  aria-current={p === safePage ? "page" : undefined}
                  className={`um-page-btn ${p === safePage ? "um-page-btn--active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="um-page-btn"
                aria-label="Next page"
                disabled={safePage === totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                <ChevronRight size={13} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
      <Dialog open={modalMode !== null} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === "add" ? "Add New User" : "Edit User"}</DialogTitle>
            <DialogDescription>
              {modalMode === "add"
                ? "Fill in the details to create a new user. A default password will be generated."
                : "Update the user details below."}
            </DialogDescription>
          </DialogHeader>
          <div className="um-form-grid">
            {modalMode === "edit" && editingUser && (
              <div className="um-field">
                <label htmlFor="um-user-id" className="um-label">User ID</label>
                <input id="um-user-id" className="um-input" value={editingUser.userId} disabled aria-disabled="true" />
              </div>
            )}
            <div className="um-field">
              <label htmlFor="um-username" className="um-label">Username *</label>
              <input
                id="um-username"
                className="um-input"
                placeholder="Enter username"
                value={form.username}
                onChange={field("username")}
              />
            </div>
            <div className="um-field">
              <label htmlFor="um-email" className="um-label">Email *</label>
              <input
                id="um-email"
                className="um-input"
                type="email"
                placeholder="e.g. user@vst.com"
                value={form.email}
                onChange={field("email")}
              />
            </div>
            <div className="um-field">
              <label htmlFor="um-designation" className="um-label">Designation</label>
              <input
                id="um-designation"
                className="um-input"
                placeholder="e.g. Energy Manager"
                value={form.designation}
                onChange={field("designation")}
              />
            </div>
            <div className="um-field">
              <label htmlFor="um-role" className="um-label">Role</label>
              <select id="um-role" className="um-select" value={form.role} onChange={field("role")}>
                <option value="Manager">Manager</option>
                <option value="Operator">Operator</option>
              </select>
            </div>
            {modalMode === "edit" && (
              <div className="um-field">
                <label htmlFor="um-status" className="um-label">Status</label>
                <select id="um-status" className="um-select" value={String(form.isActive)} onChange={field("isActive")}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={!isFormValid || saving}>
              {saving && <Loader2 size={13} className="animate-spin" style={{ marginRight: 4 }} />}
              {modalMode === "add" ? "Create User" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Deactivate Confirmation ──────────────────────────────────── */}
      <Dialog open={deactivateTarget !== null} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>The user will lose access to the application.</DialogDescription>
          </DialogHeader>
          <p className="um-delete-msg">
            Are you sure you want to deactivate{" "}
            <span className="um-delete-name">{deactivateTarget?.username}</span>
            {" "}(<span className="um-delete-name">{deactivateTarget?.email}</span>)?
            You can reactivate them later via <strong>Edit</strong>.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateTarget(null)} disabled={deactivating}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={deactivating}>
              {deactivating && <Loader2 size={13} className="animate-spin" style={{ marginRight: 4 }} />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Password Info Dialog (create / reset) ───────────────────── */}
      <Dialog open={passwordInfo !== null} onOpenChange={(open) => !open && setPasswordInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{passwordInfo?.title}</DialogTitle>
            <DialogDescription>
              Share the temporary password with <strong>{passwordInfo?.username}</strong>.
              They will be required to change it on their first login.
            </DialogDescription>
          </DialogHeader>
          <div className="um-password-box">
            <span className="um-password-label">Default Password</span>
            <div className="um-password-row">
              <span className="um-password-value">{passwordInfo?.password}</span>
              <button
                type="button"
                className="um-copy-btn"
                aria-label="Copy password to clipboard"
                title="Copy to clipboard"
                onClick={() => passwordInfo && handleCopyPassword(passwordInfo.password)}
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setPasswordInfo(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default UserManagement;
