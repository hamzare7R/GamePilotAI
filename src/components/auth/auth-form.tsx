"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "register";

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isRegister = mode === "register";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister ? { email, password, displayName: displayName || undefined } : { email, password },
        ),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? "Something went wrong. Try again.");
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{isRegister ? "Create your pilot account" : "Welcome back, pilot"}</CardTitle>
        <CardDescription>
          {isRegister
            ? "One account for your library, coach and mail monitor."
            : "Sign in to reach your library, coach and connected services."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {isRegister ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="display-name">Display name (optional)</Label>
              <Input
                id="display-name"
                name="displayName"
                autoComplete="nickname"
                maxLength={60}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={isRegister ? 8 : undefined}
              maxLength={200}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {isRegister ? (
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="mt-1">
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-foreground underline-offset-4 hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to GamePilot?{" "}
              <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-foreground underline-offset-4 hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
