import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { type GetServerSidePropsContext } from "next";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import { env } from "~/env.mjs";
import { prismaPostgres as prisma } from "~/server/db";

// todo: make this shared -> via some kind of env variable or smth
export const saltRounds = 10;

export async function hashPassword(password: string) {
  return await bcrypt
    .genSalt(saltRounds)
    .then((salt) => bcrypt.hash(password, salt));
}

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      // ...other properties
      // role: UserRole;
    };
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  secret: process.env.NEXT_AUTH_SECRET,
  callbacks: {
    jwt: ({ token, user }) => {
      if (user !== null) {
        token = {
          ...token,
          ...user,
        };
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token !== null && token.id !== null) {
        session = {
          ...session,
          user: {
            ...token,
            ...session.user,
            id: token.id as string,
          },
        };
      }
      return session;
    },
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Email",
      // `credentials` is used to generate a form on the sign in page.
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "jsmith@company.com",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "••••••••",
        },
      },
      async authorize(credentials, req) {
        // Add logic here to look up the user from the credentials supplied

        if (!req.body?.email || !req.body.password) return null;

        const { email, password } = req.body as {
          email: string;
          password: string;
        };

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user) return null;
        if (!user.password) return null;
        if (user && bcrypt.compareSync(password, user.password)) {
          // Any object returned will be saved in `user` property of the JWT
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { password: _, ...userData } = user;
          return userData;
        } else {
          // If you return null then an error will be displayed advising the user to check their details.
          return null;

          // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
        }
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
