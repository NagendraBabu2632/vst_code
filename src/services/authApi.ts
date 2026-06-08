export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  name: string;
  email: string;
  initials: string;
  token?: string;
}

export const authApi = {
  async login({ email, password: _password }: LoginPayload): Promise<AuthUser> {
    await new Promise((r) => setTimeout(r, 800));
    const name = email
      .split("@")[0]
      .replace(/[._]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const initials = name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return { name, email, initials };
  },

  async logout(): Promise<void> {
    await new Promise((r) => setTimeout(r, 200));
  },
};
