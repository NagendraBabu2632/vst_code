import "./UserManagement.css";
import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import {
  selectUsers,
  addUser,
  updateUser,
  deleteUser,
  type User,
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
import { Pencil, Trash2, Search, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 10;

type ModalMode = "add" | "edit" | null;

interface UserForm {
  UserName: string;
  UserMailId: string;
  Designation: string;
  RoleType: "Manager" | "Operator";
  Active: "Yes" | "No";
}

const emptyForm = (): UserForm => ({
  UserName: "",
  UserMailId: "",
  Designation: "",
  RoleType: "Operator",
  Active: "Yes",
});

const UserManagement = () => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectUsers);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        String(u.UserId).includes(q) ||
        u.UserName.toLowerCase().includes(q) ||
        u.UserMailId.toLowerCase().includes(q) ||
        u.RoleType.toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const openAdd = () => {
    setForm(emptyForm());
    setEditingUser(null);
    setModalMode("add");
  };

  const openEdit = (user: User) => {
    setForm({
      UserName: user.UserName,
      UserMailId: user.UserMailId,
      Designation: user.Designation,
      RoleType: user.RoleType,
      Active: user.Active,
    });
    setEditingUser(user);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingUser(null);
  };

  const handleSave = () => {
    if (!form.UserName.trim() || !form.UserMailId.trim()) return;
    if (modalMode === "add") {
      dispatch(addUser({
        UserName: form.UserName.trim(),
        UserMailId: form.UserMailId.trim(),
        Designation: form.Designation.trim(),
        RoleType: form.RoleType,
        Active: form.Active,
      }));
    } else if (modalMode === "edit" && editingUser) {
      dispatch(updateUser({
        UserId: editingUser.UserId,
        UserName: form.UserName.trim(),
        UserMailId: form.UserMailId.trim(),
        Designation: form.Designation.trim(),
        RoleType: form.RoleType,
        Active: form.Active,
      }));
    }
    closeModal();
  };

  const handleDelete = () => {
    if (deleteTarget) {
      dispatch(deleteUser(deleteTarget.UserId));
      setDeleteTarget(null);
    }
  };

  const field = (key: keyof UserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const isFormValid = form.UserName.trim() && form.UserMailId.trim();

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
                  <th>User Mail ID</th>
                  <th>Designation</th>
                  <th>Role</th>
                  <th>Active</th>
                  <th>Creation Date</th>
                  <th>Modification Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="um-empty">No users found.</div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((user) => (
                    <tr key={user.UserId}>
                      <td>{user.UserId}</td>
                      <td>{user.UserName}</td>
                      <td>{user.UserMailId}</td>
                      <td>{user.Designation}</td>
                      <td>
                        <span className={`um-badge ${user.RoleType === "Manager" ? "um-badge--manager" : "um-badge--operator"}`}>
                          {user.RoleType}
                        </span>
                      </td>
                      <td>
                        <span className={`um-badge ${user.Active === "Yes" ? "um-badge--yes" : "um-badge--no"}`}>
                          {user.Active}
                        </span>
                      </td>
                      <td>{user.creationDateUTC}</td>
                      <td>{user.modifiedDateUTC}</td>
                      <td>
                        <div className="um-actions">
                          <button
                            type="button"
                            className="um-icon-btn um-icon-btn--edit"
                            aria-label={`Edit ${user.UserName}`}
                            onClick={() => openEdit(user)}
                          >
                            <Pencil size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="um-icon-btn um-icon-btn--delete"
                            aria-label={`Delete ${user.UserName}`}
                            onClick={() => setDeleteTarget(user)}
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
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

      {/* Add / Edit Modal */}
      <Dialog open={modalMode !== null} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === "add" ? "Add New User" : "Edit User"}</DialogTitle>
            <DialogDescription>
              {modalMode === "add" ? "Fill in the details to create a new user." : "Update the user details below."}
            </DialogDescription>
          </DialogHeader>
          <div className="um-form-grid">
            {modalMode === "edit" && editingUser && (
              <div className="um-field">
                <label htmlFor="um-user-id" className="um-label">User ID</label>
                <input id="um-user-id" className="um-input" value={editingUser.UserId} disabled aria-disabled="true" />
              </div>
            )}
            <div className="um-field">
              <label htmlFor="um-username" className="um-label">Username *</label>
              <input
                id="um-username"
                className="um-input"
                placeholder="Enter username"
                value={form.UserName}
                onChange={field("UserName")}
              />
            </div>
            <div className="um-field">
              <label htmlFor="um-mailid" className="um-label">User Mail ID *</label>
              <input
                id="um-mailid"
                className="um-input"
                type="email"
                placeholder="e.g. user@example.com"
                value={form.UserMailId}
                onChange={field("UserMailId")}
              />
            </div>
            <div className="um-field">
              <label htmlFor="um-designation" className="um-label">Designation</label>
              <input
                id="um-designation"
                className="um-input"
                placeholder="e.g. Energy Manager"
                value={form.Designation}
                onChange={field("Designation")}
              />
            </div>
            <div className="um-field">
              <label htmlFor="um-role" className="um-label">Role</label>
              <select id="um-role" className="um-select" value={form.RoleType} onChange={field("RoleType")}>
                <option value="Manager">Manager</option>
                <option value="Operator">Operator</option>
              </select>
            </div>
            {modalMode === "edit" && (
              <div className="um-field">
                <label htmlFor="um-active" className="um-label">Active</label>
                <select id="um-active" className="um-select" value={form.Active} onChange={field("Active")}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={!isFormValid}>
              {modalMode === "add" ? "Create User" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <p className="um-delete-msg">
            Are you sure you want to delete user{" "}
            <span className="um-delete-name">{deleteTarget?.UserName}</span>{" "}
            (<span className="um-delete-name">{deleteTarget?.UserMailId}</span>)?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default UserManagement;
