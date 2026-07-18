"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Footer from "~/components/layout/footer/footer";
import { Button } from "~/components/ui/button";
import { Card, CardDescription, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth-client";

export default function LoggInnPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const userId = (formData.get("user_id") as string)?.trim();
    const password = formData.get("password") as string;

    const { error } = await authClient.signIn(userId, password);

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        backgroundColor: "var(--page-bg)",
        backgroundImage: "var(--page-bg-image)",
      }}
    >
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <Card>
            <form onSubmit={handleLogin} style={{ padding: "3rem" }}>
              <div
                style={{
                  marginBottom: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <CardTitle className="text-3xl font-bold">Logg inn</CardTitle>
                <CardDescription>
                  Logg inn med ditt TIHLDE-brukernavn og passord
                </CardDescription>
              </div>

              {error && (
                <div
                  className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm"
                  style={{ marginBottom: "1.5rem" }}
                >
                  {error}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                  marginBottom: "2rem",
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="login-user-id">
                    Brukernavn <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="login-user-id"
                    name="user_id"
                    type="text"
                    autoComplete="username"
                    required
                    placeholder="ditt TIHLDE-brukernavn"
                    className="h-12"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="login-password">
                    Passord <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="h-12"
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <Button
                  type="submit"
                  className="h-12 w-full text-base"
                  disabled={loading}
                >
                  {loading ? "Logger inn..." : "Logg inn"}
                </Button>
                <p className="text-muted-foreground text-center text-sm">
                  Ny student uten TIHLDE-bruker?{" "}
                  <Link href="/registrering" className="underline">
                    Registrer deg her
                  </Link>
                </p>
              </div>
            </form>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
