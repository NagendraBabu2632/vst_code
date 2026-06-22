import "./DashboardLayout.css";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Settings, ChevronRight } from "lucide-react";
import AppSidebar from "@/components/AppSidebar/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";
import UserProfileDropdown from "@/components/UserProfileDropdown/UserProfileDropdown";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import darkLogo from "@/assets/VST_Logo.png";
import lightLogo from "@/assets/lightthemelogo.png";
import { useAppSelector } from "@/redux/hooks/reduxHooks";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const SETTINGS_TABS = [
  { value: "sku", label: "Blend" },
  { value: "tariff", label: "Tariff" },
  { value: "moisture-specs", label: "Moisture Specs" },
  { value: "process", label: "Process Params" },
  { value: "upload", label: "Production Upload" },
  { value: "ec-losses", label: "Electricity Consumption Losses" },
  { value: "alerts", label: "Alert Configurator" },
];

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const theme = useAppSelector((s) => s.theme.theme);
  const logo = theme === "dark" ? darkLogo : lightLogo;

  useEffect(() => {
    const onMouseUp = () => document.body.classList.remove("main-dragging");
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  return (
    <div className="layout">
      <header className="layout__header">
        <div className="layout__header-left">
          <img src={logo} alt="VST" className="layout__brand-logo" />
          <span className="layout__brand-name">Digital Factory System</span>
        </div>

        <div className="layout__header-right">
          <div className="layout__live-wrap">
            <span className="layout__live-label">Live</span>
            <span className="layout__live-dot" />
          </div>

          <ThemeToggle />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/alerts" className="layout__icon-btn" aria-label="Alerts">
                  <Bell />
                  <span className="layout__alert-badge">2</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Alerts</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button type="button" className="layout__icon-btn" aria-label="Settings">
                      <Settings />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <PopoverContent align="end" sideOffset={8} className="settings-menu">
              <div className="settings-menu__heading">Settings</div>
              <div className="settings-menu__list">
                {SETTINGS_TABS.map((tab) => (
                  <button
                    type="button"
                    key={tab.value}
                    className="settings-menu__btn"
                    onClick={() => {
                      setSettingsOpen(false);
                      navigate(`/settings?tab=${tab.value}`);
                    }}
                  >
                    <span>{tab.label}</span>
                    <ChevronRight />
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <UserProfileDropdown />
        </div>
      </header>

      <AppSidebar />

      <main
        className="layout__main"
        onMouseDown={() => document.body.classList.add("main-dragging")}
      >
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;