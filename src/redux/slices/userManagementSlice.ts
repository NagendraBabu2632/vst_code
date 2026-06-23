import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface User {
  UserId: number;
  UserName: string;
  FirstName: string;
  LastName: string;
  RoleType: "Admin" | "Operator";
  Active: "Yes" | "No";
  creationDateUTC: string;
  modifiedDateUTC: string;
}

interface UserManagementState {
  users: User[];
  nextId: number;
}

const staticUsers: User[] = [
  { UserId: 1017, UserName: "dsfsd", FirstName: "sdfsd", LastName: "sdfwefsd", RoleType: "Operator", Active: "Yes", creationDateUTC: "Sep 13, 2024", modifiedDateUTC: "Sep 13, 2024" },
  { UserId: 1027, UserName: "kesava", FirstName: "nagendra", LastName: "babu", RoleType: "Admin", Active: "Yes", creationDateUTC: "Sep 16, 2024", modifiedDateUTC: "Sep 23, 2024" },
  { UserId: 1035, UserName: "kesavsri", FirstName: "kk", LastName: "sri", RoleType: "Admin", Active: "Yes", creationDateUTC: "Sep 16, 2024", modifiedDateUTC: "Sep 23, 2024" },
  { UserId: 1066, UserName: "nagendra.kolli@carbynetech.com", FirstName: "Nagendra", LastName: "Kolli", RoleType: "Admin", Active: "Yes", creationDateUTC: "Sep 23, 2024", modifiedDateUTC: "Sep 27, 2024" },
];

const initialState: UserManagementState = {
  users: staticUsers,
  nextId: 2000,
};

const userManagementSlice = createSlice({
  name: "userManagement",
  initialState,
  reducers: {
    addUser(state, action: PayloadAction<Omit<User, "UserId" | "creationDateUTC" | "modifiedDateUTC">>) {
      const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      state.users.push({
        ...action.payload,
        UserId: state.nextId++,
        creationDateUTC: now,
        modifiedDateUTC: now,
      });
    },
    updateUser(state, action: PayloadAction<Pick<User, "UserId" | "FirstName" | "LastName" | "RoleType" | "Active">>) {
      const user = state.users.find((u) => u.UserId === action.payload.UserId);
      if (user) {
        user.FirstName = action.payload.FirstName;
        user.LastName = action.payload.LastName;
        user.RoleType = action.payload.RoleType;
        user.Active = action.payload.Active;
        user.modifiedDateUTC = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }
    },
    deleteUser(state, action: PayloadAction<number>) {
      state.users = state.users.filter((u) => u.UserId !== action.payload);
    },
  },
});

export const { addUser, updateUser, deleteUser } = userManagementSlice.actions;
export default userManagementSlice.reducer;

export const selectUsers = (s: { userManagement: UserManagementState }) => s.userManagement.users;
