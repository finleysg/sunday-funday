import { render } from "@react-email/render";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { MagicLinkEmail } from "@/lib/emails/magic-link";

const baseURL =
  process.env["BETTER_AUTH_URL"] ?? process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export const auth = betterAuth({
  baseURL,
  secret: process.env["BETTER_AUTH_SECRET"],
  database: prismaAdapter(prisma, { provider: "mysql" }),
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  // Invite-only roster: better-auth must not auto-create users from a magic-link
  // verification. The Player table is the source of truth, and we only create a
  // matching User row inside our own sendMagicLink callback when the email is
  // an active player.
  emailAndPassword: { enabled: false },
  plugins: [
    magicLink({
      expiresIn: 60 * 10,
      disableSignUp: false,
      sendMagicLink: async ({ email, url }) => {
        const player = await prisma.player.findUnique({
          where: { email: email.toLowerCase() },
        });
        // Silent rejection: emails outside the roster get no email and no
        // error leak. better-auth still recorded a verification token; it
        // simply expires unused.
        if (!player || !player.active) return;

        const html = await render(MagicLinkEmail({ url, recipientName: player.name }));
        await sendEmail({
          to: email,
          subject: "Your Sunday Fun Day sign-in link",
          html,
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
