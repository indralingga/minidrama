"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Home, Compass, Bookmark, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Search query states
  const [query, setQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Bookmark", href: "/bookmark", icon: Bookmark },
  ];

  // Sync search input with URL parameter
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
    if (q) setShowSearchInput(true);
  }, [searchParams]);

  // Handle Search Submission and redirect to Home page with query
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/?q=${encodeURIComponent(query.trim())}`);
  };

  // Clear search and return to home default feed
  const clearSearch = () => {
    setQuery("");
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
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

        {/* Desktop Telegram Channel Button */}
        <a
          href="https://t.me/minidrama_channel"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-full bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 text-zinc-300 hover:text-blue-400 text-xs font-bold transition-all duration-300 shadow-md group hover:bg-blue-500/5 mr-1 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="fill-current group-hover:animate-pulse"
          >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
          Telegram Channel
        </a>

        {/* Integrated Search Input in Header */}
        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          <form
            onSubmit={handleSearchSubmit}
            className={cn(
              "relative flex items-center transition-all duration-300 w-full",
              showSearchInput || query ? "opacity-100 scale-100" : "w-0 md:w-full opacity-0 md:opacity-100 scale-95 md:scale-100 pointer-events-none md:pointer-events-auto"
            )}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul drama di semua provider..."
              className="w-full bg-zinc-900 border border-zinc-800/80 rounded-full pl-4 pr-10 py-2 text-xs md:text-sm focus:outline-none focus:border-rose-500 text-white placeholder-zinc-500"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 text-zinc-400 hover:text-white p-0.5 rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          {/* Toggle search input button on mobile screens */}
          {!showSearchInput && !query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearchInput(true)}
              className="text-muted-foreground hover:text-foreground md:hidden"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          {/* Search Button for desktop */}
          {(showSearchInput || query) && (
            <Button
              onClick={handleSearchSubmit}
              size="sm"
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-full gap-1 px-4 text-xs border-0 hidden md:flex"
            >
              <Search className="h-3.5 w-3.5" /> Cari
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
