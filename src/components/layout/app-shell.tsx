import { auth } from "@/lib/auth";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const signedIn = !!session?.user;

  return (
    <>
      <AppHeader signedIn={signedIn} />
      <div className="mx-auto min-h-full w-full max-w-lg px-0 pb-20 md:max-w-5xl md:px-6 md:pb-10 lg:max-w-7xl lg:px-8">
        {children}
      </div>
      <BottomNav signedIn={signedIn} />
    </>
  );
}
