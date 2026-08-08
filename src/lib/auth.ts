import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import authConfig from "./auth.config";
import { db } from "./db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "./db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: db
    ? DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  session: { strategy: "jwt" },
  ...authConfig,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = "user";

        // Read the role per request so promotions apply without re-signing in.
        if (db) {
          const [row] = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, token.id as string))
            .limit(1);
          if (row) session.user.role = row.role;
        }
      }
      return session;
    },
  },
});
