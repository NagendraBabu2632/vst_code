import "./UserProfileDropdown.css";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import { logout } from "@/redux/slices/authSlice";

const UserProfileDropdown = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

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
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button type="button" className="user-profile__trigger" aria-label="User menu">
                <div className="user-profile__avatar">{initials}</div>
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>User Info</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="end" sideOffset={8} className="user-profile__menu">
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
