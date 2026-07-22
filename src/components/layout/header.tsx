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
  cover?: string;
  episodes?: number;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  // Search Dialog States
  const [isOpen, setIsOpen] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
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
              setSelectedProvider(data[0].slug);
            }
          }
        } catch (e) {
          console.error("Gagal memuat provider pencarian:", e);
        }
      }
      fetchProviders();
      // Reset search state
      setQuery("");
      setResults([]);
      setSearched(false);
    }
  }, [isOpen]);

  // Handle Search Submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !selectedProvider) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `/api/gateway?provider=${selectedProvider}&action=search&q=${encodeURIComponent(
          query
        )}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json?.status && Array.isArray(json?.data)) {
          setResults(
            json.data.map((item: any) => ({
              id: item.id || item.dramaId,
              title: item.title || item.name || "Untitled Drama",
              poster: item.poster || item.cover || item.image || "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop",
            }))
          );
        } else {
          setResults([]);
        }
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Gagal melakukan pencarian:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to watched drama and close dialog
  const navigateToDrama = (id: string) => {
    setIsOpen(false);
    router.push(`/watch/${id}?provider=${selectedProvider}`);
  };

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

        {/* Right Actions (Search Dialog Gate) */}
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
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="text-left font-bold text-lg">Pencarian Drama</DialogTitle>
              </DialogHeader>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="flex flex-col gap-4 mt-2">
                <div className="flex gap-2">
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    required
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari judul drama..."
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-500 text-white"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl border-0 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4" /> Cari
                    </>
                  )}
                </Button>
              </form>

              {/* Search Results Grid */}
              <div className="mt-4 max-h-[50vh] overflow-y-auto scrollbar-none pr-1">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="h-8 w-8 text-rose-500 animate-spin" />
                    <span className="text-xs text-zinc-400">Mencari di {selectedProvider}...</span>
                  </div>
                ) : results.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {results.map((drama) => (
                      <div
                        key={drama.id}
                        onClick={() => navigateToDrama(drama.id)}
                        className="flex flex-col gap-1.5 cursor-pointer group"
                      >
                        <div className="relative aspect-[9/16] rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden group-hover:border-rose-500 transition-colors">
                          <img
                            src={drama.poster}
                            alt={drama.title}
                            className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="p-2 rounded-full bg-rose-500 text-white shadow-lg">
                              <Play className="h-4 w-4 fill-current ml-0.5" />
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold line-clamp-2 leading-tight text-zinc-200 group-hover:text-rose-400 transition-colors">
                          {drama.title}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : searched ? (
                  <div className="text-center text-zinc-500 text-xs py-10">
                    Tidak ditemukan drama dengan kata kunci tersebut.
                  </div>
                ) : (
                  <div className="text-center text-zinc-500 text-xs py-10">
                    Masukkan kata kunci di atas untuk mencari drama.
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
