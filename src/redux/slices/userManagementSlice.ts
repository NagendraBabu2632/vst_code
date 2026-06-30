import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";
import type {
  UserApiItem,
  CreateUserPayload,
  UpdateUserPayload,
  CreateUserResponse,
  ResetPasswordResponse,
} from "@/services/api";

export type { UserApiItem };

interface UserManagementState {
  users: UserApiItem[];
  loading: boolean;
  error: string | null;
}

const initialState: UserManagementState = {
  users: [],
  loading: false,
  error: null,
};

const extractMessage = (err: any): string =>
  err?.response?.data?.message ?? err?.message ?? "Operation failed.";

export const fetchUsers = createAsyncThunk("userManagement/fetchUsers", async (_, { rejectWithValue }) => {
  try {
    return await apiService.fetchUsers();
  } catch (err) {
    return rejectWithValue(extractMessage(err));
  }
});

export const createUser = createAsyncThunk(
  "userManagement/createUser",
  async (payload: CreateUserPayload, { rejectWithValue }) => {
    try {
      return await apiService.createUser(payload);
    } catch (err) {
      return rejectWithValue(extractMessage(err));
    }
  }
);

export const editUser = createAsyncThunk(
  "userManagement/editUser",
  async ({ id, payload }: { id: number; payload: UpdateUserPayload }, { rejectWithValue }) => {
    try {
      return await apiService.updateUser(id, payload);
    } catch (err) {
      return rejectWithValue(extractMessage(err));
    }
  }
);

export const deactivateUser = createAsyncThunk(
  "userManagement/deactivateUser",
  async (id: number, { rejectWithValue }) => {
    try {
      await apiService.deactivateUser(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractMessage(err));
    }
  }
);

export const resetUserPassword = createAsyncThunk(
  "userManagement/resetUserPassword",
  async (id: number, { rejectWithValue }) => {
    try {
      return await apiService.resetUserPassword(id);
    } catch (err) {
      return rejectWithValue(extractMessage(err));
    }
  }
);

const userManagementSlice = createSlice({
  name: "userManagement",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch all users
      .addCase(fetchUsers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Edit user — update row in place from API response
      .addCase(editUser.fulfilled, (state, action) => {
        const updated = action.payload?.user;
        if (updated) {
          const idx = state.users.findIndex((u) => u.userId === updated.userId);
          if (idx !== -1) state.users[idx] = updated;
        }
      })

      // Deactivate — mark isActive=false locally
      .addCase(deactivateUser.fulfilled, (state, action) => {
        const user = state.users.find((u) => u.userId === action.payload);
        if (user) user.isActive = false;
      });
  },
});

export default userManagementSlice.reducer;

export const selectUsers        = (s: { userManagement: UserManagementState }) => s.userManagement.users;
export const selectUsersLoading = (s: { userManagement: UserManagementState }) => s.userManagement.loading;
export const selectUsersError   = (s: { userManagement: UserManagementState }) => s.userManagement.error;
