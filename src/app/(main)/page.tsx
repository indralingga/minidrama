"use client";

import React, { useState, useEffect } from "react";
import { Play, Sparkles, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Provider {
  id: string;
  name: string;
  slug: string;
  category: "SHORT" | "DRAMA" | "FILM" | "ANIME";
  iconUrl?: string;
  apiBaseUrl: string;
  isActive: boolean;
  sortOrder: number;
}

interface DramaItem {
  id: string;
  title: string;
  poster?: string;
  cover?: string;
  episodes?: number;
  rating?: string;
}

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [dramasByProvider, setDramasByProvider] = useState<Record<string, DramaItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [heroDrama, setHeroDrama] = useState<{ drama: DramaItem; provider: string } | null>(null);

  const categories = [
    { label: "Semua", value: "ALL" },
    { label: "Short Drama", value: "SHORT" },
    { label: "Film", value: "FILM" },
    { label: "Anime", value: "ANIME" },
  ];

  // Fetch providers from DB
  useEffect(() => {
    async function fetchProvidersAndRank() {
      try {
        const res = await fetch("/api/providers?active=true");
        let activeProviders: Provider[] = [];

        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            activeProviders = data;
          }
        }

        // Fallback default providers if database empty
        if (activeProviders.length === 0) {
          activeProviders = [
            { id: "1", name: "ReelShort", slug: "reelshort", category: "SHORT", isActive: true, sortOrder: 1, apiBaseUrl: "" },
            { id: "2", name: "NetShort", slug: "netshort", category: "SHORT", isActive: true, sortOrder: 2, apiBaseUrl: "" },
            { id: "3", name: "DramaBox", slug: "dramabox", category: "DRAMA", isActive: true, sortOrder: 3, apiBaseUrl: "" },
            { id: "4", name: "ShortMax", slug: "shortmax", category: "SHORT", isActive: true, sortOrder: 4, apiBaseUrl: "" },
          ];
        }

        setProviders(activeProviders);

        // Fetch rank for each provider
        const dramaMap: Record<string, DramaItem[]> = {};
        for (const p of activeProviders) {
          try {
            const rankRes = await fetch(`/api/gateway?provider=${p.slug}&action=rank`);
            if (rankRes.ok) {
              const rankData = await rankRes.json();
              if (rankData?.status && Array.isArray(rankData?.data)) {
                dramaMap[p.slug] = rankData.data.map((item: any) => ({
                  id: item.id || item.dramaId,
                  title: item.title || item.name || "Untitled Drama",
                  poster: item.poster || item.cover || item.image || "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop",
                  cover: item.cover || item.poster || "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop",
                  episodes: item.episodes || item.totalEpisodes || 80,
                  rating: item.rating || "4.9",
                }));
              }
            }
          } catch (e) {
            console.error(`Failed to fetch rank for ${p.slug}:`, e);
          }
        }

        setDramasByProvider(dramaMap);

        // Set top hero drama from first provider
        const firstSlug = activeProviders[0]?.slug;
        if (firstSlug && dramaMap[firstSlug]?.length > 0) {
          setHeroDrama({ drama: dramaMap[firstSlug][0], provider: firstSlug });
        }
      } catch (err) {
        console.error("Error loading home data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProvidersAndRank();
  }, []);

  const filteredProviders = providers.filter(
    (p) => activeCategory === "ALL" || p.category === activeCategory
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Category Pills Header */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4 sticky top-16 bg-background/95 backdrop-blur z-20">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`flex-none px-5 py-2 rounded-full text-xs md:text-sm font-semibold border transition-all duration-200 ${
              activeCategory === cat.value
                ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/20"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Hero Banner Section */}
      <section className="relative h-60 sm:h-72 md:h-80 lg:h-96 w-full rounded-3xl bg-gradient-to-br from-zinc-900 via-rose-950 to-zinc-900 overflow-hidden shadow-2xl border border-border group">
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent z-10" />
        <div
          className="absolute right-0 top-0 bottom-0 w-full md:w-2/3 bg-cover bg-center mix-blend-luminosity opacity-40 group-hover:scale-105 transition-transform duration-700"
          style={{
            backgroundImage: `url(${heroDrama?.drama.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200'})`,
          }}
        />
        <div className="relative z-20 flex flex-col justify-end h-full p-6 md:p-10 gap-3 max-w-2xl">
          <span className="text-xs font-bold tracking-wider uppercase text-rose-400 bg-rose-500/20 border border-rose-500/30 px-3 py-1 rounded-full w-max flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Terpopuler Hari Ini
          </span>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white line-clamp-2">
            {heroDrama?.drama.title || "CEO Jatuh Cinta Pada Gadis Desa"}
          </h2>
          <p className="text-xs md:text-sm text-zinc-300 line-clamp-2 max-w-xl leading-relaxed">
            Streaming gratis ribuan episode drama dan film populer dari berbagai provider tanpa registrasi!
          </p>
          {heroDrama && (
            <Link
              href={`/watch/${heroDrama.drama.id}?provider=${heroDrama.provider}`}
              className="w-max mt-2"
            >
              <Button size="lg" className="bg-rose-500 hover:bg-rose-600 text-white font-bold gap-2 shadow-xl shadow-rose-500/30 border-0 rounded-xl px-6">
                <Play className="h-4 w-4 fill-current" /> Nonton Sekarang
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Provider List Grid */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold tracking-tight text-lg md:text-xl flex items-center gap-2">
            <Film className="h-5 w-5 text-rose-500" /> Pilih Provider
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl border border-border bg-card animate-pulse" />
              ))
            : filteredProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center gap-3 p-3 md:p-4 rounded-2xl border border-border bg-card hover:bg-accent/60 cursor-pointer transition-all duration-200 hover:border-rose-500/50 group"
                >
                  {provider.iconUrl ? (
                    <img
                      src={provider.iconUrl}
                      alt={provider.name}
                      className="h-10 w-10 md:h-12 md:w-12 rounded-xl object-cover group-hover:scale-105 transition-transform flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center font-bold text-lg text-white flex-shrink-0">
                      {provider.name[0]}
                    </div>
                  )}
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-bold truncate group-hover:text-rose-400 transition-colors">
                      {provider.name}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Live Stream</span>
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* Dynamic Carousels */}
      {filteredProviders.map((provider) => {
        const list = dramasByProvider[provider.slug] || [];

        return (
          <section key={provider.id} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold tracking-tight text-lg md:text-xl flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                {provider.name} Trending
              </h3>
            </div>

            {list.length > 0 ? (
              <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-none pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {list.map((drama) => (
                  <Link
                    key={drama.id}
                    href={`/watch/${drama.id}?provider=${provider.slug}`}
                    className="flex-none w-32 sm:w-40 md:w-48 flex flex-col gap-2.5 group cursor-pointer"
                  >
                    <div className="relative aspect-[9/16] w-full rounded-2xl bg-zinc-900 border border-border shadow-md overflow-hidden group-hover:border-rose-500/50 transition-all duration-300">
                      <img
                        src={drama.poster}
                        alt={drama.title}
                        className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                      <span className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-md text-[11px] font-bold text-yellow-400 px-2 py-0.5 rounded-md border border-yellow-500/20">
                        ★ {drama.rating}
                      </span>
                      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-xs font-bold text-zinc-300">
                        <span>{drama.episodes} Ep</span>
                        <span className="bg-rose-500/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110">
                          <Play className="h-3 w-3 fill-current" />
                        </span>
                      </div>
                    </div>
                    <span className="text-xs md:text-sm font-bold line-clamp-2 px-1 text-zinc-200 group-hover:text-rose-400 transition-colors leading-tight">
                      {drama.title}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 italic py-2">
                Memuat data dari {provider.name}...
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
