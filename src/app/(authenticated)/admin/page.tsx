import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader, PageShell } from "~/components/layout/page-shell";
import { auth } from "~/server/auth/config";
import { AdminPanel } from "./admin-panel";

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.isAdmin) {
    redirect("/");
  }

  return (
    <PageShell>
      <PageHeader
        title="Adminpanel"
        description="Administrer brukere, faddergrupper og aktiviteter."
      />
      <AdminPanel />
    </PageShell>
  );
}
