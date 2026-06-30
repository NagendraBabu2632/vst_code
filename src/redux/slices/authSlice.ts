import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";

export interface User {
  userId: number;
  name: string;
  email: string;
  role: string;
  initials: string;
  lastLoggedIn: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  mustChangePassword: boolean;
  pendingUserId: number | null;
  changePasswordLoading: boolean;
  changePasswordError: string | null;
}

const STORAGE_KEY = "dfs_user";

function loadUserFromStorage(): User | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  user: loadUserFromStorage(),
  isAuthenticated: !!loadUserFromStorage(),
  loading: false,
  error: null,
  mustChangePassword: false,
  pendingUserId: null,
  changePasswordLoading: false,
  changePasswordError: null,
};

export const loginAsync = createAsyncThunk(
  "auth/login",
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await apiService.login(email, password);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Login failed");
    }
  }
);

export const changePasswordAsync = createAsyncThunk(
  "auth/changePassword",
  async (
    { userId, oldPassword, newPassword }: { userId: number; oldPassword: string; newPassword: string },
    { rejectWithValue }
  ) => {
    try {
      return await apiService.changePassword(userId, oldPassword, newPassword);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to change password");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.mustChangePassword = false;
      state.pendingUserId = null;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("dfs_token");
    },
    clearError(state) {
      state.error = null;
      state.changePasswordError = null;
    },
    resetChangePassword(state) {
      state.mustChangePassword = false;
      state.pendingUserId = null;
      state.changePasswordError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Login
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        const res = action.payload;
        if (res.mustChangePassword) {
          state.mustChangePassword = true;
          state.pendingUserId = res.userId;
        } else {
          const initials = (res.username ?? "")
            .split(" ")
            .map((w: string) => w[0] ?? "")
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const user: User = {
            userId:      res.userId,
            name:        res.username,
            email:       res.email,
            role:        res.role,
            initials,
            lastLoggedIn: res.lastLoggedIn,
          };
          state.user = user;
          state.isAuthenticated = true;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        }
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── Change Password
      .addCase(changePasswordAsync.pending, (state) => {
        state.changePasswordLoading = true;
        state.changePasswordError = null;
      })
      .addCase(changePasswordAsync.fulfilled, (state) => {
        state.changePasswordLoading = false;
        state.mustChangePassword = false;
        state.pendingUserId = null;
      })
      .addCase(changePasswordAsync.rejected, (state, action) => {
        state.changePasswordLoading = false;
        state.changePasswordError = action.payload as string;
      });
  },
});

export const { logout, clearError, resetChangePassword } = authSlice.actions;
export default authSlice.reducer;
