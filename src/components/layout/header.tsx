"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Home, Compass, Bookmark, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Provider {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  poster?: string;
  providerSlug: string;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  // Search Dialog States
  const [isOpen, setIsOpen] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [query, setQuery] = useState("");
  const [groupedResults, setGroupedResults] = useState<Record<string, SearchResult[]>>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Explore", href: "/explore", icon: Compass },
    { label: "Bookmark", href: "/bookmark", icon: Bookmark },
  ];

  // Fetch active providers when search dialog is opened
  useEffect(() => {
    if (isOpen) {
      async function fetchProviders() {
        try {
          const res = await fetch("/api/providers?active=true");
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              setProviders(data);
              return;
            }
          }
        } catch (e) {
          console.error("Gagal memuat provider:", e);
        }

        // Robust fallback providers list if database is loading or empty
        setProviders([
          { id: "1", name: "ReelShort", slug: "reelshort", isActive: true },
          { id: "2", name: "NetShort", slug: "netshort", isActive: true },
          { id: "3", name: "DramaBox", slug: "dramabox", isActive: true },
          { id: "4", name: "ShortMax", slug: "shortmax", isActive: true },
        ]);
      }
      
      fetchProviders();
      // Reset search states
      setQuery("");
      setGroupedResults({});
      setSearched(false);
    }
  }, [isOpen]);

  // Handle Search Submission across ALL active providers in parallel
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Use current state providers or fallback to default
    const searchTargets = providers.length > 0 ? providers : [
      { id: "1", name: "ReelShort", slug: "reelshort", isActive: true },
      { id: "2", name: "NetShort", slug: "netshort", isActive: true },
      { id: "3", name: "DramaBox", slug: "dramabox", isActive: true },
      { id: "4", name: "ShortMax", slug: "shortmax", isActive: true },
    ];

    setLoading(true);
    setSearched(true);
    const newGroupedResults: Record<string, SearchResult[]> = {};

    try {
      await Promise.all(
        searchTargets.map(async (p) => {
          try {
            const res = await fetch(
              `/api/gateway?provider=${p.slug}&action=search&q=${encodeURIComponent(query)}`
            );
            if (res.ok) {
              const json = await res.json();
              if (json?.status && Array.isArray(json?.data) && json.data.length > 0) {
                newGroupedResults[p.name] = json.data.map((item: any) => ({
                  id: item.id || item.dramaId,
                  title: item.title || item.name || "Untitled Drama",
                  poster: item.poster || item.cover || item.image || "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop",
                  providerSlug: p.slug,
                }));
              }
            }
          } catch (err) {
            console.error(`Gagal mencari di provider ${p.name}:`, err);
          }
        })
      );
      setGroupedResults(newGroupedResults);
    } catch (err) {
      console.error("Gagal melakukan pencarian multi-provider:", err);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to watch page
  const navigateToDrama = (id: string, providerSlug: string) => {
    setIsOpen(false);
    router.push(`/watch/${id}?provider=${providerSlug}`);
  };

  // Count total matches found
  const totalMatches = Object.values(groupedResults).reduce(
    (acc, curr) => acc + curr.length,
    0
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-rose-500 via-orange-500 to-yellow-500 bg-clip-text text-xl md:text-2xl font-black tracking-wider text-transparent">
            MiniDrama
          </span>
          <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            FREE
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-semibold transition-colors hover:text-rose-500 flex items-center gap-2 py-1 border-b-2",
                  isActive
                    ? "text-rose-500 border-rose-500"
                    : "text-muted-foreground border-transparent"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger render={
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              />
            }>
              <Search className="h-5 w-5" />
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl w-[92vw] md:w-full rounded-3xl p-4 md:p-6 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-left font-extrabold text-base md:text-lg">Pencarian Multi-Provider</DialogTitle>
              </DialogHeader>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="flex flex-col gap-4 mt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari judul drama di semua provider..."
                    className="flex-1 bg-zinc-800 border border-zinc-700/60 rounded-2xl px-4 py-2.5 text-xs md:text-sm focus:outline-none focus:border-rose-500 text-white"
                  />
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2.5 rounded-2xl border-0 flex items-center justify-center gap-2 text-xs md:text-sm"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-4 w-4" /> Cari
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Grouped Search Results List */}
              <div className="mt-5 max-h-[50vh] overflow-y-auto scrollbar-none pr-1 flex flex-col gap-5">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="h-9 w-9 text-rose-500 animate-spin" />
                    <span className="text-xs text-zinc-400 text-center px-4">Mencari di semua provider secara bersamaan...</span>
                  </div>
                ) : totalMatches > 0 ? (
                  Object.entries(groupedResults).map(([providerName, list]) => (
                    <div key={providerName} className="flex flex-col gap-2.5 border-b border-zinc-800/40 pb-4 last:border-0 last:pb-0">
                      <h4 className="text-[10px] md:text-xs font-black tracking-widest text-rose-400 uppercase flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        {providerName} ({list.length} Cocok)
                      </h4>
                      {/* Responsive columns: 3 cols on mobile, 4 cols on desktop */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:gap-3">
                        {list.map((drama) => (
                          <div
                            key={drama.id}
                            onClick={() => navigateToDrama(drama.id, drama.providerSlug)}
                            className="flex flex-col gap-1.5 cursor-pointer group"
                          >
                            <div className="relative aspect-[9/16] rounded-xl bg-zinc-800 border border-zinc-700/60 overflow-hidden group-hover:border-rose-500 transition-colors">
                              <img
                                src={drama.poster}
                                alt={drama.title}
                                className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop";
                                }}
                              />
                              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="p-2.5 rounded-full bg-rose-500 text-white shadow-lg">
                                  <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                                </span>
                              </div>
                            </div>
                            <span className="text-[9px] md:text-[11px] font-extrabold line-clamp-2 leading-tight text-zinc-300 group-hover:text-rose-400 transition-colors">
                              {drama.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : searched ? (
                  <div className="text-center text-zinc-500 text-xs py-16">
                    Tidak ditemukan drama yang cocok di seluruh provider.
                  </div>
                ) : (
                  <div className="text-center text-zinc-500 text-xs py-16">
                    Masukkan kata kunci di atas untuk mencari secara serentak di semua provider.
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
