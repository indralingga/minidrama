import React from "react";
import { Sparkles, Film, Bookmark, Heart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Free Platform Header Banner */}
      <section className="relative p-6 rounded-3xl bg-gradient-to-br from-rose-950 via-zinc-900 to-zinc-900 border border-rose-500/20 overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col gap-3">
          <span className="text-xs font-bold tracking-wider uppercase text-rose-400 bg-rose-500/20 px-3 py-1 rounded-full w-max border border-rose-500/30 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> 100% Free Access
          </span>
          <h2 className="text-2xl font-black text-white">Nonton Sepuasnya Tanpa Syarat</h2>
          <p className="text-xs text-zinc-300 max-w-md leading-relaxed">
            MiniDrama dapat diakses gratis oleh siapa saja. Tanpa perlu mendaftar, tanpa kunci episode, dan tanpa koin!
          </p>
        </div>
      </section>

      {/* Telegram Channel Join Card */}
      <section className="relative p-6 rounded-3xl bg-gradient-to-br from-blue-950 via-zinc-900 to-zinc-900 border border-blue-500/20 overflow-hidden shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2 relative z-10">
          <span className="text-[10px] font-black tracking-wider uppercase text-blue-400 bg-blue-500/20 px-2.5 py-0.5 rounded-full w-max border border-blue-500/30 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="fill-current"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg> TELEGRAM CHANNEL
          </span>
          <h2 className="text-xl font-black text-white">Ikuti Update Drama Terbaru</h2>
          <p className="text-xs text-zinc-300 max-w-sm leading-relaxed">
            Dapatkan notifikasi instan saat ada judul drama populer baru, pembaruan tautan, atau pengumuman server!
          </p>
        </div>
        <a 
          href="https://t.me/minidrama_channel"
          target="_blank"
          rel="noopener noreferrer"
          className="z-10 w-full md:w-auto"
        >
          <Button className="w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white font-bold gap-2 rounded-xl shadow-lg shadow-blue-500/20 border-0 px-6 py-5">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="fill-current"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg> Gabung Channel
          </Button>
        </a>
      </section>

      {/* App Highlights / Features */}
      <section className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl border border-border bg-card flex flex-col gap-2">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 w-max">
            <Film className="h-5 w-5" />
          </div>
          <span className="text-sm font-bold">Semua Judul Gratis</span>
          <span className="text-xs text-muted-foreground">Ribuan micro-drama dari berbagai provider.</span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card flex flex-col gap-2">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 w-max">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-sm font-bold">Tanpa Kunci Episode</span>
          <span className="text-xs text-muted-foreground">Tonton dari episode 1 hingga tamat langsung.</span>
        </div>
      </section>

      {/* Quick Statistics Placeholder */}
      <section className="flex flex-col gap-3">
        <h3 className="font-bold tracking-tight text-base">Aktivitas Saya</h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/40 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Bookmark className="h-5 w-5 text-yellow-400" />
              <span className="text-sm font-semibold">Drama Disimpan</span>
            </div>
            <span className="text-xs text-muted-foreground font-bold">3 Judul</span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/40 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-rose-500" />
              <span className="text-sm font-semibold">Drama Disukai</span>
            </div>
            <span className="text-xs text-muted-foreground font-bold">12 Disukai</span>
          </div>
        </div>
      </section>
    </div>
  );
}
