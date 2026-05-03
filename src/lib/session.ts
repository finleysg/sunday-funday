import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { auth, type Session } from "@/lib/auth";

export async function getSession(): Promise<Session | null> {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!isAdmin(session.user.email)) redirect("/");
  return session;
}
