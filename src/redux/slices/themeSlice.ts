import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type Theme = "light" | "dark";

const STORAGE_KEY = "dfs_theme";

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored === "dark" || stored === "light" ? stored : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

const currentTheme = loadTheme();
applyTheme(currentTheme);

interface ThemeState {
  theme: Theme;
}

const initialState: ThemeState = {
  theme: currentTheme,
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
      applyTheme(action.payload);
      localStorage.setItem(STORAGE_KEY, action.payload);
    },
    toggleTheme(state) {
      const next: Theme = state.theme === "dark" ? "light" : "dark";
      state.theme = next;
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
