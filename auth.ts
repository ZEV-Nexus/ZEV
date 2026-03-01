import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { User } from "./shared/types";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import client from "@/shared/lib/mongodb";
import { compare } from "bcrypt";
import { userModel } from "./shared/schema";
import { connectMongoose } from "@/shared/lib/mongoose";
import sendWelcomeEmail from "./shared/service/email/send-welcome-email";
import { LoginMethod } from "./feature/auth/types";

declare module "next-auth" {
  /**
   * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: Pick<
      User,
      | "email"
      | "nickname"
      | "username"
      | "bio"
      | "avatar"
      | "provider"
      | "emailVerified"
      | "id"
      | "githubUsername"
    >;
  }
}
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({ allowDangerousEmailAccountLinking: true }),
    Credentials({
      credentials: {
        email: {
          label: "電子郵件",
          type: "email",
          placeholder: "輸入您的電子郵件",
        },
        password: { label: "密碼", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) {
          console.error("Missing email or password in credentials");
          return null;
        }

        await connectMongoose();
        const user = (await userModel.findOne({
          email,
        })) as User | null;

        if (user) {
          const isMatch = await compare(password, user.password!);
          if (isMatch) {
            return {
              id: user.id,
              email: user.email,
              nickname: user.nickname,
              bio: user.bio,
              provider: user.provider,
              emailVerified: user.emailVerified,
              avatar: user.avatar,
            };
          }
        }
        console.log("authorize return user");
        return null;
      },
    }),
  ],
  adapter: MongoDBAdapter(client),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    session: async ({ session, user }) => {
      const email = session.user?.email || user.email;

      if (email) {
        await connectMongoose();
        const dbUser = await userModel.findOne({ email: email });
        if (dbUser) {
          session.user = {
            id: dbUser.id,

            username: dbUser.username || "",
            email: dbUser.email!,
            nickname: dbUser?.nickname || "",
            bio: dbUser?.bio || "",
            avatar: dbUser?.avatar || "",
            provider: (dbUser?.provider as LoginMethod) || "credentials",
            emailVerified: session.user?.emailVerified,
            githubUsername: dbUser?.githubUsername || "",
          };
        }
      }

      return session;
    },
    signIn: async ({ user, profile, account }) => {
      await connectMongoose();
      const loginUser = await userModel.findOne({ email: user.email });
      if (!loginUser && profile) {
        const email = user.email || "";
        const baseUsername = email
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9_.-]/g, "");
        let username = baseUsername;
        let suffix = 1;
        while (await userModel.findOne({ username })) {
          username = `${baseUsername}${suffix}`;
          suffix++;
        }
        const githubUsername =
          account?.provider === "github" ? profile?.login || "" : "";

        const newUser = new userModel({
          username,
          email: user.email,
          nickname: profile?.name || "",
          provider: account?.provider || profile?.provider,
          avatar: user?.image || profile?.picture,
          emailVerified: profile?.email_verified || false,
          githubUsername,
        });

        await newUser.save();

        await sendWelcomeEmail(newUser.nickname!, newUser.email!);
      } else if (loginUser && account?.provider === "github") {
        // Update githubUsername for existing users who sign in via GitHub
        const ghLogin = profile?.login || "";
        if (ghLogin && !loginUser.githubUsername) {
          await userModel.findByIdAndUpdate(loginUser._id, {
            githubUsername: ghLogin,
          });
        }
      }

      return true;
    },
  },
});
