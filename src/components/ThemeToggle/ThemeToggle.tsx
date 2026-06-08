import "./ThemeToggle.css";
import { Sun, Moon } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import { toggleTheme } from "@/redux/slices/themeSlice";

const ThemeToggle = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.theme.theme);

  return (
    <button
      className="theme-toggle"
      onClick={() => dispatch(toggleTheme())}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </button>
  );
};

export default ThemeToggle;
