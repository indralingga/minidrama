import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Header */}
      <Header />

      {/* Main Content Area - Full Responsive Max Width */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-12 pt-6">
        {children}
      </main>

      {/* Bottom Nav Bar (Mobile only) */}
      <BottomNav />
    </div>
  );
}
