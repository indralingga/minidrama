"use client";

import React, { useState, useEffect } from "react";
import { Bookmark, Play, Trash2 } from "lucide-react";
import Link from "next/link";

interface BookmarkedDrama {
  id: string;
  title: string;
  poster: string;
  provider: string;
  addedAt: number;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkedDrama[]>([]);
  const [loading, setLoading] = useState(true);

  // Load bookmarks from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("minidrama_bookmarks");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Sort by added date descending (newest bookmarks first)
          parsed.sort((a, b) => b.addedAt - a.addedAt);
          setBookmarks(parsed);
        }
      } catch (e) {
        console.error("Failed to parse bookmarks:", e);
      }
    }
    setLoading(false);
  }, []);

  // Quick remove bookmark handler
  const removeBookmark = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = bookmarks.filter((item) => item.id !== id);
    setBookmarks(updated);
    localStorage.setItem("minidrama_bookmarks", JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-500">
        <span className="text-xs animate-pulse">Memuat daftar simpanan...</span>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[50vh] text-center px-4 animate-fade-in">
        <div className="p-4 rounded-full bg-zinc-900 text-zinc-500 mb-2 border border-zinc-800">
          <Bookmark className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold">Belum Ada Bookmark</h2>
        <p className="text-sm text-zinc-500 max-w-xs">
          Simpan drama favorit Anda agar tidak ketinggalan episode terbarunya!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-16">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-rose-500 fill-rose-500/20" /> Bookmark Saya
          </h2>
          <p className="text-xs text-zinc-500">Menyimpan {bookmarks.length} drama favorit Anda</p>
        </div>
      </div>

      {/* Grid view of bookmarked dramas */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
        {bookmarks.map((drama) => (
          <Link
            key={drama.id}
            href={`/watch/${drama.id}?provider=${drama.provider}`}
            className="flex flex-col gap-2 group cursor-pointer relative"
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-90 group-hover:opacity-75 transition-opacity" />
              
              {/* Play Overlay Icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="p-2.5 rounded-full bg-rose-500 text-white shadow-lg">
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </span>
              </div>

              {/* Trash/Remove Button overlay */}
              <button
                onClick={(e) => removeBookmark(drama.id, e)}
                className="absolute top-2 right-2 z-20 p-2 rounded-xl bg-black/75 hover:bg-rose-600 text-zinc-400 hover:text-white transition-all border border-white/5 shadow-md pointer-events-auto"
                title="Hapus Bookmark"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="text-xs font-bold line-clamp-2 px-1 text-zinc-300 group-hover:text-rose-400 transition-colors leading-tight">
              {drama.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
