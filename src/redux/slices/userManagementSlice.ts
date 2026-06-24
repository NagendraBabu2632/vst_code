import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface User {
  UserId: number;
  UserName: string;
  UserMailId: string;
  Designation: string;
  RoleType: "Manager" | "Operator";
  Active: "Yes" | "No";
  creationDateUTC: string;
  modifiedDateUTC: string;
}

interface UserManagementState {
  users: User[];
  nextId: number;
}

const staticUsers: User[] = [
  {
    UserId: 1071,
    UserName: "Ravi Kumar",
    UserMailId: "ravi@vst.com",
    Designation: "Energy Manager",
    RoleType: "Manager",
    Active: "Yes",
    creationDateUTC: "Jun 23, 2026",
    modifiedDateUTC: "Jun 23, 2026"
  },
  {
    UserId: 1072,
    UserName: "Anita Sharma",
    UserMailId: "anita@vst.com",
    Designation: "Operator",
    RoleType: "Operator",
    Active: "Yes",
    creationDateUTC: "Jun 23, 2026",
    modifiedDateUTC: "Jun 23, 2026"
  },
  {
    UserId: 1073,
    UserName: "S RANGA RAO",
    UserMailId: "rangarao@vstind.com",
    Designation: "DGM",
    RoleType: "Manager",
    Active: "Yes",
    creationDateUTC: "Jun 23, 2026",
    modifiedDateUTC: "Jun 23, 2026"
  },
  {
    UserId: 1074,
    UserName: "CH SAMBAIAH",
    UserMailId: "sambaiah@vstind.com",
    Designation: "Deputy Electrical Manager",
    RoleType: "Manager",
    Active: "Yes",
    creationDateUTC: "Jun 23, 2026",
    modifiedDateUTC: "Jun 23, 2026"
  },
  {
    UserId: 1075,
    UserName: "A JAYA SRINVASU",
    UserMailId: "ajsrinivasu@vstind.com",
    Designation: "Deputy Electrical Manager",
    RoleType: "Manager",
    Active: "Yes",
    creationDateUTC: "Jun 23, 2026",
    modifiedDateUTC: "Jun 23, 2026"
  }
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
    updateUser(state, action: PayloadAction<Pick<User, "UserId" | "UserName" | "UserMailId" | "Designation" | "RoleType" | "Active">>) {
      const user = state.users.find((u) => u.UserId === action.payload.UserId);
      if (user) {
        user.UserName = action.payload.UserName;
        user.UserMailId = action.payload.UserMailId;
        user.Designation = action.payload.Designation;
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
