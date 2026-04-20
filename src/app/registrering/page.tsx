"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardDescription, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth-client";

type View = "login" | "register";

export default function RegistreringPage() {
  const [view, setView] = useState<View>("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const switchView = (next: View) => {
    setError(null);
    setView(next);
  };

  const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await authClient.signIn.email({ email, password });

    if (error) {
      setError(error.message ?? "Noe gikk galt ved innlogging.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleRegister = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passordene stemmer ikke overens.");
      setLoading(false);
      return;
    }

    const { error } = await authClient.signUp.email({ name, email, password });

    if (error) {
      setError(error.message ?? "Noe gikk galt ved registrering.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        backgroundColor: "var(--page-bg)",
        backgroundImage: "var(--page-bg-image)",
      }}
    >
      <div className="w-full max-w-xl">
        <Card>
          {view === "login" ? (
            <form onSubmit={handleLogin} style={{ padding: "3rem" }}>
              <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <CardTitle className="text-3xl font-bold">Logg inn</CardTitle>
                <CardDescription>
                  Logg inn med ditt TIHLDE brukernavn og passord
                </CardDescription>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm" style={{ marginBottom: "1.5rem" }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
                <div className="grid gap-2">
                  <Label htmlFor="login-email">
                    E-post <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    placeholder="din@epost.no"
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
                    required
                    placeholder="••••••••"
                    className="h-12"
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
                  {loading ? "Logger inn..." : "Logg inn"}
                </Button>
                <div className="flex w-full justify-between text-sm">
                  <button type="button" className="text-primary font-medium hover:underline">
                    Glemt passord?
                  </button>
                  <button type="button" onClick={() => switchView("register")} className="text-primary font-medium hover:underline">
                    Opprett bruker
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ padding: "3rem" }}>
              <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <CardTitle className="text-3xl font-bold">Opprett bruker</CardTitle>
                <CardDescription>
                  Fyll inn informasjonen din for å opprette en konto
                </CardDescription>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm" style={{ marginBottom: "1.5rem" }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
                <div className="grid gap-2">
                  <Label htmlFor="register-name">
                    Fullt navn <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="register-name"
                    name="name"
                    type="text"
                    required
                    placeholder="Ola Nordmann"
                    className="h-12"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="register-email">
                    E-post <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="register-email"
                    name="email"
                    type="email"
                    required
                    placeholder="din@epost.no"
                    className="h-12"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="register-password">
                    Passord <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="register-password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="h-12"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="register-confirm-password">
                    Bekreft passord <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="register-confirm-password"
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="h-12"
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
                  {loading ? "Registrerer..." : "Opprett konto"}
                </Button>
                <div className="flex w-full justify-center text-sm">
                  <button type="button" onClick={() => switchView("login")} className="text-primary font-medium hover:underline">
                    Har du allerede en konto? Logg inn
                  </button>
                </div>
              </div>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
