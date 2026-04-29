"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth-client";

type Status = "idle" | "sending" | "sent";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    // Always show "sent" regardless of whether the email is on the roster.
    // The server silently drops non-roster emails (decisions.md: invite-only).
    await signIn.magicLink({
      email,
      callbackURL: "/",
    });
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="bg-card space-y-3 rounded-lg border p-6 text-sm">
        <p className="font-medium">Check your email.</p>
        <p className="text-muted-foreground">
          If <span className="font-medium">{email}</span> is on the roster, we&apos;ve sent a
          sign-in link. The link works once and expires in 10 minutes.
        </p>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-xs underline"
          onClick={() => {
            setStatus("idle");
            setEmail("");
          }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-card space-y-4 rounded-lg border p-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit" className="w-full" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send sign-in link"}
      </Button>
    </form>
  );
}
