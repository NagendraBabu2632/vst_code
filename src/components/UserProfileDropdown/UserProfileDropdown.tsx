import "./UserProfileDropdown.css";
import { useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import { logout } from "@/redux/slices/authSlice";

const HOVER_CLOSE_DELAY = 150;

const UserProfileDropdown = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openNow = () => {
    clearCloseTimer();
    setOpen(true);
  };
  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY);
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="user-profile__trigger"
          aria-label="User menu"
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
        >
          <div className="user-profile__avatar">{initials}</div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="user-profile__menu"
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
      >
        <div className="user-profile__menu-header">
          <div className="user-profile__menu-name">{user?.name ?? "User"}</div>
          {user?.role && <div className="user-profile__menu-role">{user.role}</div>}
          {user?.email && <div className="user-profile__menu-email">{user.email}</div>}
        </div>

        <button
          className="user-profile__menu-item user-profile__menu-item--danger"
          onClick={handleLogout}
        >
          <LogOut />
          Logout
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default UserProfileDropdown;
