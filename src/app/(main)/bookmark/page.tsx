import React from "react";
import { Bookmark } from "lucide-react";

export default function BookmarksPage() {
  return (
    <div className="flex flex-col gap-6 items-center justify-center min-h-[50vh] text-center px-4">
      <div className="p-4 rounded-full bg-accent text-muted-foreground mb-2">
        <Bookmark className="h-8 w-8" />
      </div>
      <h2 className="text-lg font-bold">Belum Ada Bookmark</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Simpan drama favorit Anda agar tidak ketinggalan episode terbarunya!
      </p>
    </div>
  );
}
