"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit2, ToggleLeft, ToggleRight, ArrowUp, ArrowDown, Save, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog/Form states
  const [isOpen, setIsOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Partial<Provider> | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategory, setFormCategory] = useState<"SHORT" | "DRAMA" | "FILM" | "ANIME">("SHORT");
  const [formIconUrl, setFormIconUrl] = useState("");
  const [formApiBaseUrl, setFormApiBaseUrl] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);

  // Fetch all providers
  async function loadProviders() {
    try {
      const res = await fetch("/api/providers");
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProviders();
  }, []);

  // Set form when editing
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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formName,
      slug: formSlug,
      category: formCategory,
      iconUrl: formIconUrl,
      apiBaseUrl: formApiBaseUrl,
      sortOrder: Number(formSortOrder),
    };

    try {
      let res;
      if (editingProvider?.id) {
        // Update
        res = await fetch("/api/providers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingProvider.id, isActive: editingProvider.isActive, ...payload }),
        });
      } else {
        // Create
        res = await fetch("/api/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setIsOpen(false);
        loadProviders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle provider active state
  const toggleActive = async (provider: Provider) => {
    const updatedStatus = !provider.isActive;
    
    // Optimistic Update
    setProviders(prev => prev.map(p => p.id === provider.id ? { ...p, isActive: updatedStatus } : p));

    try {
      const res = await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...provider, isActive: updatedStatus }),
      });
      if (!res.ok) {
        // Revert on error
        loadProviders();
      }
    } catch (err) {
      console.error(err);
      loadProviders();
    }
  };

  // Adjust sort order priority
  const updateOrder = async (provider: Provider, direction: "up" | "down") => {
    const change = direction === "up" ? -1 : 1;
    const newOrder = provider.sortOrder + change;

    try {
      await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...provider, sortOrder: newOrder }),
      });
      loadProviders();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 max-w-lg mx-auto pb-24 border-x border-zinc-900">
      {/* Admin Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-2 rounded-full hover:bg-zinc-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h2 className="text-xl font-bold tracking-tight">Kelola Provider</h2>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={startCreate} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white gap-1 font-semibold">
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-xs sm:max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-left font-bold">
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
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm focus:outline-none focus:border-rose-500 text-white"
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
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm focus:outline-none focus:border-rose-500 text-white"
                  placeholder="e.g. netshort"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400">Kategori</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as any)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm focus:outline-none focus:border-rose-500 text-white"
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
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm focus:outline-none focus:border-rose-500 text-white"
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
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm focus:outline-none focus:border-rose-500 text-white"
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
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm focus:outline-none focus:border-rose-500 text-white"
                />
              </div>

              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1 mt-2 border-0">
                <Save className="h-4 w-4" /> Simpan Perubahan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Provider List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="text-center text-zinc-500 text-sm py-10 animate-pulse">Memuat data...</div>
        ) : providers.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm py-10">Belum ada provider terdaftar.</div>
        ) : (
          providers.map(provider => (
            <Card key={provider.id} className="bg-zinc-900 border-zinc-800 text-white">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  {provider.iconUrl ? (
                    <img src={provider.iconUrl} alt={provider.name} className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-400 flex-shrink-0">
                      {provider.name[0]}
                    </div>
                  )}
                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm truncate">{provider.name}</span>
                      <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-semibold border border-zinc-700">
                        {provider.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 truncate">{provider.apiBaseUrl}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Priority Order Adjustment */}
                  <div className="flex flex-col gap-1">
                    <button onClick={() => updateOrder(provider, "up")} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => updateOrder(provider, "down")} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Active Toggle Switch */}
                  <button onClick={() => toggleActive(provider)} className="transition-all active:scale-95">
                    {provider.isActive ? (
                      <ToggleRight className="h-8 w-8 text-emerald-400 fill-current" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-zinc-600" />
                    )}
                  </button>

                  {/* Edit button */}
                  <Button onClick={() => startEdit(provider)} variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
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
