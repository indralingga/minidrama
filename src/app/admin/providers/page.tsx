"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Save,
  Loader2,
  Lock,
  User,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  category: "SHORT" | "DRAMA" | "FILM" | "ANIME";
  iconUrl?: string;
  apiBaseUrl: string;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminProvidersPage() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Provider states
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategory, setFormCategory] = useState<"SHORT" | "DRAMA" | "FILM" | "ANIME">("SHORT");
  const [formIconUrl, setFormIconUrl] = useState("");
  const [formApiBaseUrl, setFormApiBaseUrl] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);

  // Check login session on mount
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem("admin_authenticated");
    if (sessionAuth === "true") {
      setIsAuthenticated(true);
      loadProviders();
    }
  }, []);

  // Fetch providers list
  const loadProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/providers");
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch (err) {
      console.error("Gagal memuat provider:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Admin Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authUsername, password: authPassword }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem("admin_authenticated", "true");
        setIsAuthenticated(true);
        loadProviders();
      } else {
        setAuthError(data.error || "Kredensial salah");
      }
    } catch (err) {
      setAuthError("Gagal menghubungi server");
    } finally {
      setAuthLoading(false);
    }
  };

  // Toggle active status
  const toggleActive = async (provider: Provider) => {
    try {
      const res = await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: provider.id, isActive: !provider.isActive }),
      });
      if (res.ok) loadProviders();
    } catch (err) {
      console.error(err);
    }
  };

  // Update order prioritize
  const updateOrder = async (provider: Provider, direction: "up" | "down") => {
    const diff = direction === "up" ? -1 : 1;
    try {
      await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: provider.id, sortOrder: provider.sortOrder + diff }),
      });
      loadProviders();
    } catch (err) {
      console.error(err);
    }
  };

  // Edit provider modal open
  const startEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setFormName(provider.name);
    setFormSlug(provider.slug);
    setFormCategory(provider.category);
    setFormIconUrl(provider.iconUrl || "");
    setFormApiBaseUrl(provider.apiBaseUrl);
    setFormSortOrder(provider.sortOrder);
    setIsOpen(true);
  };

  // Create provider modal open
  const startCreate = () => {
    setEditingProvider(null);
    setFormName("");
    setFormSlug("");
    setFormCategory("SHORT");
    setFormIconUrl("");
    setFormApiBaseUrl("");
    setFormSortOrder(providers.length + 1);
    setIsOpen(true);
  };

  // Handle Form Submit (Add/Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: editingProvider?.id,
      name: formName,
      slug: formSlug,
      category: formCategory,
      iconUrl: formIconUrl || null,
      apiBaseUrl: formApiBaseUrl,
      sortOrder: formSortOrder,
    };

    try {
      const method = editingProvider ? "PUT" : "POST";
      const res = await fetch("/api/providers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsOpen(false);
        loadProviders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Render Login Card if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl shadow-2xl flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="p-4 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black">Portal Admin</h2>
            <p className="text-xs text-zinc-400">Silakan login untuk mengelola provider MiniDrama</p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Username
              </label>
              <input
                type="text"
                required
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                className="bg-zinc-800 border border-zinc-700/60 rounded-xl p-3 text-sm focus:outline-none focus:border-rose-500 text-white"
                placeholder="Masukkan username"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Password
              </label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="bg-zinc-800 border border-zinc-700/60 rounded-xl p-3 text-sm focus:outline-none focus:border-rose-500 text-white"
                placeholder="Masukkan password"
              />
            </div>

            <Button
              type="submit"
              disabled={authLoading}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold p-3 rounded-xl border-0 mt-2 flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Masuk Ke Dashboard"
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Render Full Desktop-supported Dashboard Layout
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 max-w-7xl mx-auto pb-24">
      {/* Admin Header with Desktop Margins */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2.5 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors border border-zinc-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">Kelola Provider</h2>
            <p className="text-xs text-zinc-400">Atur status aktif (Show/Hide) dan urutan provider streaming</p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={
            <Button onClick={startCreate} size="sm" className="bg-rose-500 hover:bg-rose-600 text-white gap-1.5 font-bold rounded-xl px-5 py-2.5 border-0 shadow-lg shadow-rose-500/10" />
          }>
            <Plus className="h-4 w-4" /> Tambah Provider
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-left font-bold text-lg">
                {editingProvider ? "Edit Provider" : "Tambah Provider Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400">Nama Provider</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-rose-500 text-white"
                  placeholder="e.g. NetShort"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400">Slug (ID API)</label>
                <input
                  type="text"
                  required
                  value={formSlug}
                  onChange={e => setFormSlug(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-rose-500 text-white"
                  placeholder="e.g. netshort"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400">Kategori</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as any)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-rose-500 text-white"
                >
                  <option value="SHORT">Short Drama</option>
                  <option value="DRAMA">Drama</option>
                  <option value="FILM">Film</option>
                  <option value="ANIME">Anime</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400">URL Icon Image</label>
                <input
                  type="text"
                  value={formIconUrl}
                  onChange={e => setFormIconUrl(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-rose-500 text-white"
                  placeholder="https://..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400">API Base URL</label>
                <input
                  type="text"
                  required
                  value={formApiBaseUrl}
                  onChange={e => setFormApiBaseUrl(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-rose-500 text-white"
                  placeholder="https://www.cutad.web.id/api/public/slug"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400">Prioritas Urutan</label>
                <input
                  type="number"
                  required
                  value={formSortOrder}
                  onChange={e => setFormSortOrder(Number(e.target.value))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-rose-500 text-white"
                />
              </div>

              <Button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white font-bold gap-1.5 mt-2 border-0 rounded-xl py-3">
                <Save className="h-4 w-4" /> Simpan Perubahan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Responsive Grid Layout for Provider list on Desktop (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full text-center text-zinc-500 text-sm py-10 animate-pulse">Memuat data...</div>
        ) : providers.length === 0 ? (
          <div className="col-span-full text-center text-zinc-500 text-sm py-10">Belum ada provider terdaftar.</div>
        ) : (
          providers.map(provider => (
            <Card key={provider.id} className="bg-zinc-900/60 backdrop-blur border-zinc-800 text-white hover:border-zinc-700 transition-colors rounded-2xl overflow-hidden shadow-xl">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 overflow-hidden">
                  {provider.iconUrl ? (
                    <img
                      src={provider.iconUrl}
                      alt={provider.name}
                      className="h-12 w-12 rounded-xl object-cover flex-shrink-0 border border-zinc-800 shadow"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-700 border border-zinc-700 flex items-center justify-center font-bold text-zinc-400 flex-shrink-0 shadow">
                      {provider.name[0]}
                    </div>
                  )}
                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base truncate">{provider.name}</span>
                      <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-bold border border-rose-500/20">
                        {provider.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 truncate mt-0.5">{provider.apiBaseUrl}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {/* Order prioritizing buttons */}
                  <div className="flex flex-col gap-1">
                    <button onClick={() => updateOrder(provider, "up")} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => updateOrder(provider, "down")} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Active Toggle Switch */}
                  <button onClick={() => toggleActive(provider)} className="transition-all active:scale-95">
                    {provider.isActive ? (
                      <ToggleRight className="h-9 w-9 text-emerald-400 fill-current" />
                    ) : (
                      <ToggleLeft className="h-9 w-9 text-zinc-600" />
                    )}
                  </button>

                  {/* Edit */}
                  <Button onClick={() => startEdit(provider)} variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-zinc-800 rounded-xl">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
