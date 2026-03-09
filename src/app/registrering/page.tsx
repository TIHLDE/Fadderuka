"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { authClient } from "~/lib/auth-client";

export default function RegistreringPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      setError(error.message ?? "Noe gikk galt ved innlogging.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
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

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
    });

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
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            Fadderuka
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Logg inn eller opprett en ny konto
          </p>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="logg-inn" onValueChange={() => setError(null)}>
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="logg-inn" className="flex-1">
                Logg inn
              </TabsTrigger>
              <TabsTrigger value="registrer" className="flex-1">
                Registrer
              </TabsTrigger>
            </TabsList>

            {error && (
              <div className="bg-destructive/10 text-destructive mb-4 rounded-md px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <TabsContent value="logg-inn">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="login-email"
                    className="text-foreground text-sm font-medium"
                  >
                    E-post
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    placeholder="din@epost.no"
                    className="border-input bg-background text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="login-password"
                    className="text-foreground text-sm font-medium"
                  >
                    Passord
                  </label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="border-input bg-background text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logger inn..." : "Logg inn"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="registrer">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="register-name"
                    className="text-foreground text-sm font-medium"
                  >
                    Fullt navn
                  </label>
                  <input
                    id="register-name"
                    name="name"
                    type="text"
                    required
                    placeholder="Ola Nordmann"
                    className="border-input bg-background text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="register-email"
                    className="text-foreground text-sm font-medium"
                  >
                    E-post
                  </label>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    required
                    placeholder="din@epost.no"
                    className="border-input bg-background text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="register-password"
                    className="text-foreground text-sm font-medium"
                  >
                    Passord
                  </label>
                  <input
                    id="register-password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="border-input bg-background text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="register-confirm-password"
                    className="text-foreground text-sm font-medium"
                  >
                    Bekreft passord
                  </label>
                  <input
                    id="register-confirm-password"
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="border-input bg-background text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Registrerer..." : "Opprett konto"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </main>
  );
}
