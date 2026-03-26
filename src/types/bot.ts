import type { Context } from "telegraf";
import type { User, UserSettings } from "@prisma/client";

export type DbUserWithSettings = User & { settings: UserSettings | null };

export interface MotobroContext extends Context {
  state: Context["state"] & {
    dbUser?: DbUserWithSettings;
  };
}
