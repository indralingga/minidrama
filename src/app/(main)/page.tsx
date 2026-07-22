"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Sparkles, Film, Loader2, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

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

interface SearchResult {
  id: string;
  title: string;
  poster?: string;
  providerSlug: string;
}

// Reusable Side-Scrolling Row Component with Left/Right Navigation Arrows for Desktop
function HorizontalScrollRow({
  title,
  dramas,
  providerSlug,
}: {
  title: string;
  dramas: DramaItem[];
  providerSlug: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      const targetScroll =
        direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      rowRef.current.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative flex flex-col gap-4 overflow-hidden group/row animate-fade-in">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-900/60">
        <h3 className="font-black tracking-tight text-base md:text-lg flex items-center gap-2 text-zinc-100">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          {title}
        </h3>
      </div>

      <div className="relative w-full">
        {/* Left Arrow Button (Hidden on mobile, appears on hover on desktop) */}
        <button
          onClick={() => handleScroll("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-30 h-9 w-9 md:h-10 md:w-10 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg border border-white/10 md:opacity-0 md:group-hover/row:opacity-100 transition-opacity duration-300 pointer-events-auto cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
        </button>

        {/* Right Arrow Button (Hidden on mobile, appears on hover on desktop) */}
        <button
          onClick={() => handleScroll("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-30 h-9 w-9 md:h-10 md:w-10 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg border border-white/10 md:opacity-0 md:group-hover/row:opacity-100 transition-opacity duration-300 pointer-events-auto cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 md:h-5 md:w-5"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>

        {/* Scrollable Container Row */}
        <div
          ref={rowRef}
          className="flex overflow-x-auto scrollbar-none gap-3 md:gap-4 pb-4 -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth"
        >
          {dramas.map((drama) => (
            <Link
              key={drama.id}
              href={`/watch/${drama.id}?provider=${providerSlug}`}
              className="w-[110px] sm:w-[130px] md:w-[145px] flex-none flex flex-col gap-2 group cursor-pointer"
            >
              <div className="relative aspect-[9/16] w-full rounded-2xl bg-zinc-900 border border-border shadow-md overflow-hidden group-hover:border-rose-500/50 transition-all duration-300">
                <img
                  src={drama.poster}
                  alt={drama.title}
                  className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />
                <span className="absolute top-2 left-2 z-10 bg-black/80 backdrop-blur-md text-[9px] font-bold text-yellow-400 px-2 py-0.5 rounded-md border border-yellow-500/10">
                  ★ {drama.rating}
                </span>
                <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-[10px] font-bold text-zinc-300">
                  <span>{drama.episodes} Ep</span>
                  <span className="bg-rose-500/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 shadow-lg shadow-rose-500/20">
                    <Play className="h-2.5 w-2.5 fill-current" />
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold line-clamp-2 px-1 text-zinc-300 group-hover:text-rose-400 transition-colors leading-tight">
                {drama.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get("q") || "";

  // Core Home States
  const [providers, setProviders] = useState<Provider[]>([]);
  const [dramasByProvider, setDramasByProvider] = useState<Record<string, DramaItem[]>>({});
  const [loading, setLoading] = useState(true);

  // Slider States for Hero banner
  const [heroDramas, setHeroDramas] = useState<Array<{ drama: DramaItem; providerSlug: string }>>([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  
  // Selected Provider Tab State (default to "ALL" to stack all providers)
  const [selectedProviderSlug, setSelectedProviderSlug] = useState<string>("ALL");

  // Search States
  const [searchLoading, setSearchLoading] = useState(false);
  const [groupedResults, setGroupedResults] = useState<Record<string, SearchResult[]>>({});
  const [searched, setSearched] = useState(false);

  // Fetch providers list
  useEffect(() => {
    async function loadInitialData() {
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
            { id: "3", name: "DramaBox", slug: "dramabox", category: "SHORT", isActive: true, sortOrder: 3, apiBaseUrl: "" },
            { id: "4", name: "ShortMax", slug: "shortmax", category: "SHORT", isActive: true, sortOrder: 4, apiBaseUrl: "" },
          ];
        }

        // Ensure sorted by sortOrder
        activeProviders.sort((a, b) => a.sortOrder - b.sortOrder);
        setProviders(activeProviders);

        // Fetch trending rank for each provider
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

        // Gather Hero #1 trending drama from each active provider
        const heroesList: Array<{ drama: DramaItem; providerSlug: string }> = [];
        for (const p of activeProviders) {
          const list = dramaMap[p.slug] || [];
          if (list.length > 0) {
            heroesList.push({ drama: list[0], providerSlug: p.slug });
          }
        }
        setHeroDramas(heroesList);

      } catch (err) {
        console.error("Error loading home data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // Auto-slide effect for hero banner (cycles every 5 seconds)
  useEffect(() => {
    if (heroDramas.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroDramas.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroDramas]);

  // Monitor URL search parameter "q" and execute parallel searches
  useEffect(() => {
    if (!queryParam.trim()) {
      setGroupedResults({});
      setSearched(false);
      return;
    }

    async function executeGlobalSearch() {
      setSearchLoading(true);
      setSearched(true);
      const newGroupedResults: Record<string, SearchResult[]> = {};

      const searchTargets = providers.length > 0 ? providers : [
        { id: "1", name: "ReelShort", slug: "reelshort", isActive: true },
        { id: "2", name: "NetShort", slug: "netshort", isActive: true },
        { id: "3", name: "DramaBox", slug: "dramabox", isActive: true },
        { id: "4", name: "ShortMax", slug: "shortmax", isActive: true },
      ];

      try {
        await Promise.all(
          searchTargets.map(async (p) => {
            try {
              const res = await fetch(
                `/api/gateway?provider=${p.slug}&action=search&q=${encodeURIComponent(queryParam)}`
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
        setSearchLoading(false);
      }
    }

    executeGlobalSearch();
  }, [queryParam, providers]);

  const totalSearchMatches = Object.values(groupedResults).reduce(
    (acc, curr) => acc + curr.length,
    0
  );

  const selectedProviderObject = providers.find((p) => p.slug === selectedProviderSlug);
  const selectedProviderDramas = dramasByProvider[selectedProviderSlug] || [];

  // If Search Parameter "q" is active, render search results directly in the main page feed
  if (queryParam) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in pb-16">
        {/* Search Results Title with Back button */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-2.5 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                Hasil Pencarian: <span className="text-rose-500">"{queryParam}"</span>
              </h2>
              <p className="text-xs text-zinc-500">Menemukan {totalSearchMatches} drama di seluruh provider aktif</p>
            </div>
          </div>
        </div>

        {/* Search Content */}
        {searchLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-12 w-12 text-rose-500 animate-spin" />
            <span className="text-sm font-semibold text-zinc-400">Mencari secara serentak di semua provider...</span>
          </div>
        ) : totalSearchMatches > 0 ? (
          <div className="flex flex-col gap-8">
            {Object.entries(groupedResults).map(([providerName, list]) => (
              <section key={providerName} className="flex flex-col gap-4 border-b border-zinc-900/60 pb-6 last:border-0 last:pb-0">
                <h4 className="text-xs md:text-sm font-black tracking-widest text-rose-400 uppercase flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  {providerName} ({list.length} Cocok)
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                  {list.map((drama) => (
                    <Link
                      key={drama.id}
                      href={`/watch/${drama.id}?provider=${drama.providerSlug}`}
                      className="flex flex-col gap-2 group cursor-pointer"
                    >
                      <div className="relative aspect-[9/16] w-full rounded-2xl bg-zinc-900 border border-border shadow-md overflow-hidden group-hover:border-rose-500/50 transition-all duration-300">
                        <img
                          src={drama.poster}
                          alt={drama.title}
                          className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="p-3 rounded-full bg-rose-500 text-white shadow-lg">
                            <Play className="h-4 w-4 fill-current ml-0.5" />
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] md:text-xs font-black line-clamp-2 leading-tight text-zinc-200 group-hover:text-rose-400 transition-colors">
                        {drama.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : searched ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
            <Search className="h-8 w-8 text-zinc-600" />
            <span className="text-sm font-semibold text-zinc-500">Tidak ada drama yang cocok dengan kata kunci tersebut.</span>
            <button onClick={() => router.push("/")} className="text-xs text-rose-500 hover:underline font-bold mt-2">
              Kembali ke Beranda
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  // Render Default Main Home Feed (With Auto-Play Hero Slider and Horizontal side-scroll layout)
  return (
    <div className="flex flex-col gap-8 pb-16">
      
      {/* 1. Slider Hero Banner Section (Green Box) */}
      {heroDramas.length > 0 && (
        <section className="relative h-60 sm:h-72 md:h-80 lg:h-96 w-full rounded-3xl bg-gradient-to-br from-zinc-900 via-rose-950 to-zinc-900 overflow-hidden shadow-2xl border border-border group">
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent z-10" />
          <div
            key={currentHeroIndex} // Key triggers browser to re-animate fade-in
            className="absolute right-0 top-0 bottom-0 w-full md:w-2/3 bg-cover bg-center mix-blend-luminosity opacity-40 group-hover:scale-105 transition-all duration-1000 animate-fade-in"
            style={{
              backgroundImage: `url(${heroDramas[currentHeroIndex].drama.cover || heroDramas[currentHeroIndex].drama.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200'})`,
            }}
          />
          <div className="relative z-20 flex flex-col justify-end h-full p-6 md:p-10 gap-3 max-w-2xl">
            <span className="text-xs font-bold tracking-wider uppercase text-rose-400 bg-rose-500/20 border border-rose-500/30 px-3 py-1 rounded-full w-max flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Terpopuler Hari Ini
            </span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white line-clamp-2">
              {heroDramas[currentHeroIndex].drama.title}
            </h2>
            <p className="text-xs md:text-sm text-zinc-300 line-clamp-2 max-w-xl leading-relaxed">
              Streaming gratis ribuan episode drama populer dari berbagai provider tanpa registrasi!
            </p>
            <Link
              href={`/watch/${heroDramas[currentHeroIndex].drama.id}?provider=${heroDramas[currentHeroIndex].providerSlug}`}
              className="w-max mt-2"
            >
              <Button size="lg" className="bg-rose-500 hover:bg-rose-600 text-white font-bold gap-2 shadow-xl shadow-rose-500/30 border-0 rounded-xl px-6">
                <Play className="h-4 w-4 fill-current" /> Nonton Sekarang
              </Button>
            </Link>
          </div>

          {/* Dots Indicator for Carousel Navigation */}
          {heroDramas.length > 1 && (
            <div className="absolute bottom-4 right-6 z-30 flex gap-2">
              {heroDramas.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentHeroIndex(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentHeroIndex === i ? "w-6 bg-rose-500" : "w-2 bg-zinc-600 hover:bg-zinc-400"
                  }`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. Interactive Clickable Provider Selector Tab Grid (With 'Semua' option) */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold tracking-tight text-base md:text-lg flex items-center gap-2">
            <Film className="h-5 w-5 text-rose-500" /> Pilih Provider
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
          {/* 'Semua Provider' Card */}
          <div
            onClick={() => setSelectedProviderSlug("ALL")}
            className={`flex items-center gap-3 p-3 md:p-4 rounded-2xl border cursor-pointer transition-all duration-200 scale-100 active:scale-95 group ${
              selectedProviderSlug === "ALL"
                ? "bg-rose-500/10 border-rose-500 shadow-lg shadow-rose-500/5 ring-1 ring-rose-500/30"
                : "border-border bg-card hover:border-zinc-700/60"
            }`}
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center font-black text-xs text-white flex-shrink-0 shadow border border-rose-500/20">
              ALL
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className={`text-xs md:text-sm font-bold truncate transition-colors ${
                selectedProviderSlug === "ALL" ? "text-rose-400" : "group-hover:text-rose-400"
              }`}>
                Semua
              </span>
              <span className="text-[9px] text-zinc-500 font-bold tracking-wide uppercase">Provider</span>
            </div>
          </div>

          {/* Individual Providers */}
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl border border-border bg-card animate-pulse" />
              ))
            : providers.map((provider) => {
                const isSelected = selectedProviderSlug === provider.slug;
                return (
                  <div
                    key={provider.id}
                    onClick={() => setSelectedProviderSlug(provider.slug)}
                    className={`flex items-center gap-3 p-3 md:p-4 rounded-2xl border cursor-pointer transition-all duration-200 scale-100 active:scale-95 group ${
                      isSelected
                        ? "bg-rose-500/10 border-rose-500 shadow-lg shadow-rose-500/5 ring-1 ring-rose-500/30"
                        : "border-border bg-card hover:border-zinc-700/60"
                    }`}
                  >
                    {provider.iconUrl ? (
                      <img
                        src={provider.iconUrl}
                        alt={provider.name}
                        className="h-10 w-10 rounded-xl object-cover transition-transform flex-shrink-0 border border-zinc-800/40"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center font-bold text-base text-white flex-shrink-0">
                        {provider.name[0]}
                      </div>
                    )}
                    <div className="flex flex-col overflow-hidden">
                      <span className={`text-xs md:text-sm font-bold truncate transition-colors ${
                        isSelected ? "text-rose-400" : "group-hover:text-rose-400"
                      }`}>
                        {provider.name}
                      </span>
                      <span className="text-[9px] text-emerald-400 font-bold tracking-wide uppercase">Live Stream</span>
                    </div>
                  </div>
                );
              })}
        </div>
      </section>

      {/* 3. Stacked Feed for All Providers (If 'Semua' selected) */}
      {selectedProviderSlug === "ALL" && (
        <div className="flex flex-col gap-10">
          {providers.map((p) => {
            const dramas = dramasByProvider[p.slug] || [];
            if (dramas.length === 0) return null;
            return (
              <HorizontalScrollRow
                key={p.id}
                title={`${p.name} Trending`}
                dramas={dramas.slice(0, 12)} // Limit to top 12 trending
                providerSlug={p.slug}
              />
            );
          })}
        </div>
      )}

      {/* 3. Selected Provider's Full Drama List in Responsive Grid (If single provider selected) */}
      {selectedProviderSlug !== "ALL" && selectedProviderObject && (
        <section className="flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900/60">
            <h3 className="font-black tracking-tight text-base md:text-lg flex items-center gap-2 text-zinc-100">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              {selectedProviderObject.name} Semua Drama
            </h3>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
              <span className="text-xs italic">Memuat konten dari {selectedProviderObject.name}...</span>
            </div>
          ) : selectedProviderDramas.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
              {selectedProviderDramas.map((drama) => (
                <Link
                  key={drama.id}
                  href={`/watch/${drama.id}?provider=${selectedProviderSlug}`}
                  className="flex flex-col gap-2 group cursor-pointer"
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />
                    <span className="absolute top-2 left-2 z-10 bg-black/80 backdrop-blur-md text-[10px] font-bold text-yellow-400 px-2 py-0.5 rounded-md border border-yellow-500/10">
                      ★ {drama.rating}
                    </span>
                    <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-[11px] font-bold text-zinc-300">
                      <span>{drama.episodes} Ep</span>
                      <span className="bg-rose-500/90 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 shadow-lg shadow-rose-500/20">
                        <Play className="h-3 w-3 fill-current" />
                      </span>
                    </div>
                  </div>
                  <span className="text-xs md:text-sm font-bold line-clamp-2 px-1 text-zinc-300 group-hover:text-rose-400 transition-colors leading-tight">
                    {drama.title}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-500">
              <span className="text-xs italic">Belum ada konten dari {selectedProviderObject.name}.</span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
