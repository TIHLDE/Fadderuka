import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Footer from "~/components/layout/footer/footer";
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
    <main
      className="text-foreground relative flex min-h-screen w-full flex-1 flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--page-bg)",
        backgroundImage: "var(--page-bg-image), var(--page-gradient)",
      }}
    >

      <div className="max-w-page relative mx-auto flex w-full flex-1 flex-col !px-4 !pt-24 !pb-16 md:!px-6">
        <div className="mx-auto flex w-full flex-col !gap-6">
          <section className="!space-y-1">
            <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight text-foreground">
              Adminpanel
            </h1>
            <p className="text-muted-foreground max-w-3xl text-sm">
              Administrer brukere, faddergrupper og aktiviteter.
            </p>
          </section>

          <AdminPanel />
        </div>
      </div>

      <div className="mt-auto w-full">
        <Footer />
      </div>
    </main>
  );
}
