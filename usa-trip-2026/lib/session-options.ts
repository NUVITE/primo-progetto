import type { SessionOptions } from "iron-session";

export interface SessionData {
  familyCode?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "usa2026_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 giorni: dura tutto il viaggio
  },
};
