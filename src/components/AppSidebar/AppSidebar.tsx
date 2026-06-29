import "./AppSidebar.css";
import { LayoutDashboard, Zap, Activity, Bell, FileText, Users, FlaskConical } from "lucide-react";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { title: "Executive Summary", url: "/", icon: LayoutDashboard },
  { title: "Energy Monitoring", url: "/energy", icon: Zap },
  { title: "Process Analysis", url: "/process", icon: Activity },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Blend Tracker", url: "/blend-tracker", icon: FlaskConical },
  { title: "User Management", url: "/user-management", icon: Users },
];

const AppSidebar = () => (
  <aside className="sidebar">
    <nav className="sidebar__content">
      <ul className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <li key={item.title} className="sidebar__nav-item">
            <NavLink
              to={item.url}
              end={item.url === "/"}
              className={({ isActive }) =>
                ["sidebar__nav-link", isActive ? "sidebar__nav-link--active" : ""]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              <item.icon className="sidebar__nav-icon" />
              <span className="sidebar__nav-label">{item.title}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>

  </aside>
);

export default AppSidebar;
