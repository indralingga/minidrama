import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Suspense } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Header wrapped in Suspense because it uses useSearchParams */}
      <Suspense fallback={<div className="h-16 border-b border-border bg-background" />}>
        <Header />
      </Suspense>

      {/* Main Content Area - Full Responsive Max Width */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-12 pt-6">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <span className="text-zinc-500 animate-pulse">Memuat halaman...</span>
          </div>
        }>
          {children}
        </Suspense>
      </main>

      {/* Bottom Nav Bar (Mobile only) */}
      <BottomNav />
    </div>
  );
}
