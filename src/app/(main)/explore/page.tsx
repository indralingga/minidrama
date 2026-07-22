import React from "react";
import { Compass, Flame, TrendingUp } from "lucide-react";

export default function ExplorePage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold tracking-tight">Explore Drama</h2>
      
      {/* Category List */}
      <div className="flex flex-col gap-4">
        {[
          { title: "Paling Populer", description: "Drama paling banyak ditonton minggu ini", icon: Flame, color: "text-orange-500 bg-orange-500/10" },
          { title: "Baru Rilis", description: "Update episode terbaru hari ini", icon: Compass, color: "text-blue-500 bg-blue-500/10" },
          { title: "Rekomendasi", description: "Pilihan terbaik untuk Anda", icon: TrendingUp, color: "text-purple-500 bg-purple-500/10" }
        ].map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/30 cursor-pointer transition-colors duration-200">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${cat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{cat.title}</span>
                  <span className="text-xs text-muted-foreground">{cat.description}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
