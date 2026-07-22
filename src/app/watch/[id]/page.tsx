"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Hls from "hls.js";
import {
  Heart,
  Bookmark,
  Share2,
  AlertTriangle,
  Play,
  Volume2,
  VolumeX,
  Loader2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface EpisodeItem {
  episode: number;
  videoFakeId: string;
}

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

// Parse VTT/SRT format into array of cue objects
function parseVttOrSrt(text: string): SubtitleCue[] {
  const timeToSeconds = (t: string) => {
    const parts = t.trim().split(":");
    if (parts.length === 3) {
      const [h, m, s] = parts;
      return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseFloat(s.replace(",", "."));
    } else if (parts.length === 2) {
      const [m, s] = parts;
      return parseInt(m, 10) * 60 + parseFloat(s.replace(",", "."));
    }
    return 0;
  };

  const regex = /(\d\d:\d\d:\d\d[\.,]\d\d\d)\s*-->\s*(\d\d:\d\d:\d\d[\.,]\d\d\d)\s*\n([\s\S]*?)(?=\n\n|\r\n\r\n|\r\r|$)/g;
  const cues: SubtitleCue[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const start = timeToSeconds(match[1]);
    const end = timeToSeconds(match[2]);
    const cueText = match[3].replace(/<[^>]*>/g, "").trim();
    if (cueText) {
      cues.push({ start, end, text: cueText });
    }
  }

  return cues;
}

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dramaId = params.id as string;
  const provider = searchParams.get("provider") || "reelshort";

  // State
  const [detail, setDetail] = useState<{ title?: string; synopsis?: string } | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [currentEpisodeIdx, setCurrentEpisodeIdx] = useState(0);
  const [streamUrls, setStreamUrls] = useState<Record<number, string>>({});
  const [parsedCues, setParsedCues] = useState<Record<number, SubtitleCue[]>>({});
  const [activeSubtitleText, setActiveSubtitleText] = useState<string>("");
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState<Record<number, boolean>>({});
  const [isBuffering, setIsBuffering] = useState<Record<number, boolean>>({});
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [bookmarked, setBookmarked] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const hlsInstances = useRef<Record<number, Hls | null>>({});
  
  // Guard references to prevent async race conditions during scrolling
  const isProgrammaticScrolling = useRef(false);
  const currentEpisodeIdxRef = useRef(0);

  const notify = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => setShowNotification(null), 2500);
  };

  // Sync index ref
  useEffect(() => {
    currentEpisodeIdxRef.current = currentEpisodeIdx;
  }, [currentEpisodeIdx]);

  // Helper to pause ALL videos except the target index to prevent overlapping audio
  const pauseAllExcept = (targetIdx: number) => {
    Object.entries(videoRefs.current).forEach(([key, videoEl]) => {
      const idx = parseInt(key, 10);
      if (videoEl && idx !== targetIdx) {
        try {
          videoEl.pause();
        } catch (err) {
          // Ignore pause errors
        }
        setIsPlaying((prev) => ({ ...prev, [idx]: false }));
      }
    });
  };

  // 1. Fetch Drama Details & Episode List
  useEffect(() => {
    async function loadDramaData() {
      setPageLoading(true);
      try {
        const detailRes = await fetch(`/api/gateway?provider=${provider}&action=detail&id=${encodeURIComponent(dramaId)}`);
        if (detailRes.ok) {
          const detailJson = await detailRes.json();
          if (detailJson?.status && detailJson?.data) {
            setDetail(detailJson.data);
          }
        }

        const epRes = await fetch(`/api/gateway?provider=${provider}&action=episodes&id=${encodeURIComponent(dramaId)}`);
        if (epRes.ok) {
          const epJson = await epRes.json();
          if (epJson?.status && Array.isArray(epJson?.data) && epJson.data.length > 0) {
            const parsedEpisodes = epJson.data.map((item: any, index: number) => ({
              episode: item.episode || index + 1,
              videoFakeId: item.videoFakeId || item.id || `${dramaId}::${index + 1}`,
            }));
            setEpisodes(parsedEpisodes);
          } else {
            setEpisodes(Array.from({ length: 20 }, (_, i) => ({ episode: i + 1, videoFakeId: `fake-${i + 1}` })));
          }
        }
      } catch (err) {
        console.error("Error fetching drama data:", err);
      } finally {
        setPageLoading(false);
      }
    }

    if (dramaId) {
      loadDramaData();
    }
  }, [dramaId, provider]);

  // 2. Fetch Stream & Parse Subtitle for an Episode
  const fetchStreamData = async (idx: number, videoFakeId: string) => {
    if (streamUrls[idx]) return streamUrls[idx];

    if (videoFakeId.startsWith("fake-")) {
      const fallbackUrl = "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-sitting-on-a-chair-40348-large.mp4";
      setStreamUrls((prev) => ({ ...prev, [idx]: fallbackUrl }));
      return fallbackUrl;
    }

    try {
      setIsBuffering((prev) => ({ ...prev, [idx]: true }));
      const res = await fetch(`/api/gateway?provider=${provider}&action=stream&id=${encodeURIComponent(videoFakeId)}`);
      if (res.ok) {
        const json = await res.json();
        const streamUrl =
          json?.data?.videoUrl ||
          json?.data?.url ||
          json?.data?.streams?.[0]?.url ||
          json?.data?.stream;

        // Parse Subtitles
        const subs = json?.data?.subtitles || json?.data?.subtitle || [];
        if (Array.isArray(subs) && subs.length > 0) {
          const indoSub =
            subs.find((s: any) =>
              s.lang?.toLowerCase().includes("id") ||
              s.label?.toLowerCase().includes("indo") ||
              s.label?.toLowerCase().includes("id")
            ) || subs[0];

          if (indoSub?.url) {
            try {
              const subRes = await fetch(`/api/subtitle-proxy?url=${encodeURIComponent(indoSub.url)}`);
              if (subRes.ok) {
                const subText = await subRes.text();
                const cues = parseVttOrSrt(subText);
                setParsedCues((prev) => ({ ...prev, [idx]: cues }));
              }
            } catch (subErr) {
              console.error("Failed to parse subtitle:", subErr);
            }
          }
        }

        if (json?.status && streamUrl) {
          setStreamUrls((prev) => ({ ...prev, [idx]: streamUrl }));
          return streamUrl;
        }
      }
    } catch (err) {
      console.error("Failed to fetch stream data:", err);
    } finally {
      setIsBuffering((prev) => ({ ...prev, [idx]: false }));
    }

    const fallbackUrl = "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-sitting-on-a-chair-40348-large.mp4";
    setStreamUrls((prev) => ({ ...prev, [idx]: fallbackUrl }));
    return fallbackUrl;
  };

  // Synchronize Active Subtitle Text on Video Time Update
  const handleTimeUpdate = (idx: number, currentTime: number) => {
    if (idx !== currentEpisodeIdxRef.current) return;
    const cues = parsedCues[idx];
    if (!cues || cues.length === 0) {
      setActiveSubtitleText("");
      return;
    }

    const matchingCue = cues.find((c) => currentTime >= c.start && currentTime <= c.end);
    if (matchingCue) {
      setActiveSubtitleText(matchingCue.text);
    } else {
      setActiveSubtitleText("");
    }
  };

  // Play Video with HLS support & pause all others
  const playVideo = async (idx: number) => {
    // Abort if this idx is not the current active index anymore (User has scrolled away)
    if (idx !== currentEpisodeIdxRef.current) return;

    const ep = episodes[idx];
    if (!ep) return;

    const videoEl = videoRefs.current[idx];
    if (!videoEl) return;

    const url = await fetchStreamData(idx, ep.videoFakeId);
    if (!url) return;

    // Check again after async fetch if this is still the active index
    if (idx !== currentEpisodeIdxRef.current) {
      videoEl.pause();
      return;
    }

    // Double-check to pause all others right before playing
    pauseAllExcept(idx);

    if (url.includes(".m3u8") && Hls.isSupported()) {
      if (!hlsInstances.current[idx]) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(videoEl);
        hlsInstances.current[idx] = hls;
      }
    } else {
      if (videoEl.src !== url) {
        videoEl.src = url;
      }
    }

    videoEl.play().then(() => {
      setIsPlaying((prev) => ({ ...prev, [idx]: true }));
      setIsBuffering((prev) => ({ ...prev, [idx]: false }));
    }).catch(() => {
      setIsPlaying((prev) => ({ ...prev, [idx]: false }));
      setIsBuffering((prev) => ({ ...prev, [idx]: false }));
    });
  };

  // IntersectionObserver for vertical swipe playback
  useEffect(() => {
    if (episodes.length === 0) return;

    const observerOptions = {
      root: containerRef.current,
      rootMargin: "0px",
      threshold: 0.6,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement;
        const index = parseInt(video.dataset.index || "0", 10);

        if (entry.isIntersecting) {
          setCurrentEpisodeIdx(index);
          
          // Only trigger automatic playback if not mid programmatic smooth scrolling
          if (!isProgrammaticScrolling.current) {
            pauseAllExcept(index);
            playVideo(index);
          }
        } else {
          video.pause();
          setIsPlaying((prev) => ({ ...prev, [index]: false }));
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    const timer = setTimeout(() => {
      Object.values(videoRefs.current).forEach((video) => {
        if (video) observer.observe(video);
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      Object.values(hlsInstances.current).forEach((hls) => hls?.destroy());
    };
  }, [episodes]);

  // Toggle Play/Pause on Video Click
  const togglePlay = (idx: number) => {
    const video = videoRefs.current[idx];
    if (!video) return;

    if (video.paused) {
      playVideo(idx);
    } else {
      video.pause();
      setIsPlaying((prev) => ({ ...prev, [idx]: false }));
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    Object.values(videoRefs.current).forEach((video) => {
      if (video) video.muted = nextMuted;
    });
    notify(nextMuted ? "Suara dimatikan" : "Suara diaktifkan");
  };

  // Select Episode from Drawer
  const selectEpisode = (index: number) => {
    isProgrammaticScrolling.current = true; // Lock playback triggers during scroll transition
    pauseAllExcept(index); // Stop all previous videos immediately!
    setCurrentEpisodeIdx(index);

    const container = containerRef.current;
    if (container) {
      container.scrollTo({
        top: container.clientHeight * index,
        behavior: "smooth",
      });
    }

    // Wait for programmatic smooth scrolling to finish completely
    setTimeout(() => {
      isProgrammaticScrolling.current = false;
      playVideo(index);
    }, 800);

    notify(`Memutar Episode ${index + 1}`);
  };

  if (pageLoading) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="h-10 w-10 text-rose-500 animate-spin" />
        <span className="text-sm font-semibold text-zinc-400">Menghubungkan ke Video Stream...</span>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-black text-white overflow-hidden max-w-lg mx-auto shadow-2xl">
      {/* Toast Notification Banner */}
      {showNotification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-rose-500/90 text-white font-bold text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur animate-fade-in flex items-center gap-1.5 border border-rose-400/40">
          <Sparkles className="h-3.5 w-3.5" />
          {showNotification}
        </div>
      )}

      {/* Top Header Buttons */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
        <button
          onClick={() => router.back()}
          className="pointer-events-auto p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/80 transition-colors border border-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="pointer-events-auto flex items-center gap-2">
          <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
            100% GRATIS
          </span>
          <button
            onClick={toggleMute}
            className="pointer-events-auto p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/80 transition-colors border border-white/10"
          >
            {isMuted ? <VolumeX className="h-5 w-5 text-rose-400" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Full-screen Vertical Scroll Container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
      >
        {episodes.map((epItem, idx) => {
          const isCurrent = currentEpisodeIdx === idx;
          const isEpLiked = liked[idx] || false;
          const isEpPlaying = isPlaying[idx] ?? false;
          const isEpBuffering = isBuffering[idx] ?? false;

          return (
            <div
              key={epItem.episode}
              className="relative w-full h-full snap-start snap-always flex flex-col justify-center bg-zinc-950 select-none"
            >
              {/* Video Element */}
              <video
                ref={(el) => {
                  videoRefs.current[idx] = el;
                }}
                data-index={idx}
                loop
                muted={isMuted}
                playsInline
                preload="metadata"
                onClick={() => togglePlay(idx)}
                onTimeUpdate={(e) => {
                  const target = e.target as HTMLVideoElement;
                  handleTimeUpdate(idx, target.currentTime);
                }}
                onWaiting={() => {
                  if (isCurrent) setIsBuffering((prev) => ({ ...prev, [idx]: true }));
                }}
                onPlaying={() => {
                  setIsBuffering((prev) => ({ ...prev, [idx]: false }));
                  setIsPlaying((prev) => ({ ...prev, [idx]: true }));
                }}
                onPause={() => setIsPlaying((prev) => ({ ...prev, [idx]: false }))}
                onError={() => {
                  setIsBuffering((prev) => ({ ...prev, [idx]: false }));
                  setIsPlaying((prev) => ({ ...prev, [idx]: false }));
                }}
                className="w-full h-full object-cover cursor-pointer"
              />

              {/* Loading Spinner */}
              {isEpBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none z-20">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 text-rose-500 animate-spin" />
                    <span className="text-xs font-semibold text-zinc-300">Memuat Stream...</span>
                  </div>
                </div>
              )}

              {/* Center Play Overlay Icon when Paused */}
              {!isEpPlaying && !isEpBuffering && isCurrent && (
                <div
                  onClick={() => togglePlay(idx)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-20"
                >
                  <div className="p-5 rounded-full bg-rose-500/90 text-white shadow-2xl scale-110 hover:scale-125 transition-transform flex items-center justify-center">
                    <Play className="h-8 w-8 fill-current ml-1" />
                  </div>
                </div>
              )}

              {/* Subtitle Overlay - Positioned safely at bottom-48 */}
              {isCurrent && activeSubtitleText && (
                <div className="absolute bottom-48 left-4 right-16 z-30 flex justify-center pointer-events-none">
                  <div className="bg-black/90 backdrop-blur-md text-yellow-300 font-extrabold text-sm md:text-base px-4 py-2 rounded-2xl text-center shadow-2xl border border-yellow-500/40 max-w-xs leading-snug tracking-wide animate-fade-in">
                    {activeSubtitleText}
                  </div>
                </div>
              )}

              {/* Right Sidebar Actions */}
              <div className="absolute right-4 bottom-28 z-30 flex flex-col gap-6 items-center">
                {/* Like */}
                <button
                  onClick={() => {
                    setLiked((prev) => ({ ...prev, [idx]: !prev[idx] }));
                    notify(liked[idx] ? "Batal menyukai" : "Menyukai drama ini!");
                  }}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 group-active:scale-90 transition-transform">
                    <Heart
                      className={`h-6 w-6 transition-colors ${
                        isEpLiked ? "text-rose-500 fill-current" : "text-white"
                      }`}
                    />
                  </div>
                  <span className="text-[11px] font-bold drop-shadow">
                    {isEpLiked ? "1.2k" : "1.1k"}
                  </span>
                </button>

                {/* Bookmark */}
                <button
                  onClick={() => {
                    setBookmarked(!bookmarked);
                    notify(bookmarked ? "Dihapus dari Bookmark" : "Disimpan ke Bookmark!");
                  }}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 group-active:scale-90 transition-transform">
                    <Bookmark
                      className={`h-6 w-6 transition-colors ${
                        bookmarked ? "text-yellow-400 fill-current" : "text-white"
                      }`}
                    />
                  </div>
                  <span className="text-[11px] font-bold drop-shadow">Simpan</span>
                </button>

                {/* Share */}
                <button
                  onClick={() => notify("Tautan drama disalin ke clipboard!")}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 group-active:scale-90 transition-transform">
                    <Share2 className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-bold drop-shadow">Bagikan</span>
                </button>

                {/* Report */}
                <button
                  onClick={() => notify("Laporan Anda telah dikirimkan.")}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 group-active:scale-90 transition-transform">
                    <AlertTriangle className="h-5 w-5 text-zinc-400" />
                  </div>
                  <span className="text-[9px] font-semibold text-zinc-400">Lapor</span>
                </button>
              </div>

              {/* Bottom Video Metadata */}
              <div className="absolute left-4 bottom-24 right-20 z-30 flex flex-col gap-1.5">
                <h4 className="text-base md:text-lg font-black leading-tight drop-shadow line-clamp-1">
                  {detail?.title || "Tuduhan Palsu Pengasuh"}
                </h4>
                <p className="text-xs text-zinc-300 font-medium flex items-center gap-2">
                  <span className="font-bold text-rose-400">Episode {epItem.episode}</span>
                  <span className="h-1 w-1 bg-zinc-500 rounded-full" />
                  <span className="text-zinc-400">Full HD Stream</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Episode Selector Drawer Trigger */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/80 to-transparent pt-8 pb-4 px-4 flex justify-center">
        <Drawer>
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              className="text-xs font-bold gap-1.5 text-white bg-rose-500/90 hover:bg-rose-600 backdrop-blur px-5 py-2 rounded-full border border-rose-400/40 shadow-xl shadow-rose-500/20"
            >
              Pilih Episode ({episodes.length} Gratis)
            </Button>
          </DrawerTrigger>
          <DrawerContent className="bg-zinc-950 border-zinc-900 text-white max-w-lg mx-auto">
            <DrawerHeader>
              <DrawerTitle className="text-center font-bold text-base flex items-center justify-center gap-2">
                <span>Daftar Episode</span>
                <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                  FREE ACCESS
                </span>
              </DrawerTitle>
            </DrawerHeader>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-5 gap-3">
                {episodes.map((ep, index) => (
                  <button
                    key={ep.episode}
                    onClick={() => selectEpisode(index)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-xl border font-bold text-sm transition-all duration-200 ${
                      currentEpisodeIdx === index
                        ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/30 scale-105"
                        : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {ep.episode}
                  </button>
                ))}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
