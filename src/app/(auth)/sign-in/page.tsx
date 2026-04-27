import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sunday Fun Day</h1>
        <p className="text-muted-foreground text-sm">Sign in with the email on the roster.</p>
      </div>
      <SignInForm />
    </div>
  );
}
