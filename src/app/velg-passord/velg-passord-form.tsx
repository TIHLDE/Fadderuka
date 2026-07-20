"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export function VelgPassordForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const repeat = formData.get("password_repeat") as string;

    if (password !== repeat) {
      setError("Passordene er ikke like.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Noe gikk galt. Prøv igjen.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nytt passord</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="minst 8 tegn"
          required
          minLength={8}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password_repeat">Gjenta passordet</Label>
        <Input
          id="password_repeat"
          name="password_repeat"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Lagrer..." : "Lagre passord"}
      </Button>
    </form>
  );
}
