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
import { cn } from "@/lib/utils";

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

// Format seconds into MM:SS format
const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dramaId = params.id as string;
  const provider = searchParams.get("provider") || "reelshort";

  // Core States
  const [detail, setDetail] = useState<{ title?: string; synopsis?: string; poster?: string; cover?: string } | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [currentEpisodeIdx, setCurrentEpisodeIdx] = useState(0);
  const [streamUrls, setStreamUrls] = useState<Record<number, string>>({});
  const [parsedCues, setParsedCues] = useState<Record<number, SubtitleCue[]>>({});
  const [activeSubtitleText, setActiveSubtitleText] = useState<string>("");
  const [isMuted, setIsMuted] = useState(false); // Default unmuted with sound
  const [isPlaying, setIsPlaying] = useState<Record<number, boolean>>({});
  const [isBuffering, setIsBuffering] = useState<Record<number, boolean>>({});
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [bookmarked, setBookmarked] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // Load initial bookmark status on client mount
  useEffect(() => {
    if (!dramaId) return;
    const saved = localStorage.getItem("minidrama_bookmarks");
    if (saved) {
      try {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          const exists = list.some((item: any) => item.id === dramaId);
          setBookmarked(exists);
        }
      } catch (e) {
        console.error("Failed to parse saved bookmarks:", e);
      }
    }
  }, [dramaId]);

  // Toggle bookmark and persist in localStorage
  const toggleBookmark = () => {
    const saved = localStorage.getItem("minidrama_bookmarks");
    let list = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {
        list = [];
      }
    }

    const exists = list.some((item: any) => item.id === dramaId);
    if (exists) {
      list = list.filter((item: any) => item.id !== dramaId);
      setBookmarked(false);
      notify("Dihapus dari Bookmark");
    } else {
      const dramaPoster = detail?.poster || detail?.cover || "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop";
      const newItem = {
        id: dramaId,
        title: detail?.title || "Untitled Drama",
        poster: dramaPoster,
        provider: provider,
        addedAt: Date.now(),
      };
      list.push(newItem);
      setBookmarked(true);
      notify("Disimpan ke Bookmark!");
    }
    localStorage.setItem("minidrama_bookmarks", JSON.stringify(list));
  };

  // Auto-hide controls states
  const [showControls, setShowControls] = useState(true);

  // Time & Progress states for seek bar
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const hlsInstances = useRef<Record<number, Hls | null>>({});
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Reset progress variables when active episode changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    const activeVideo = videoRefs.current[currentEpisodeIdx];
    if (activeVideo) {
      setDuration(activeVideo.duration || 0);
      setCurrentTime(activeVideo.currentTime || 0);
    }
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

  // Reset controls visibility timer
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    const activeVideo = videoRefs.current[currentEpisodeIdxRef.current];
    const isPlayingCurrent = activeVideo ? !activeVideo.paused : false;

    if (isPlayingCurrent) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500); // Hide after 3.5 seconds
    }
  };

  // Trigger controls timer reset when play/pause state changes
  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, currentEpisodeIdx]);

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
          const headers = json.data.headers || json.data.streams?.[0]?.headers || {};
          const referer = headers.Referer || headers.referer || "";
          const origin = headers.Origin || headers.origin || "";

          let finalStreamUrl = streamUrl;
          if (referer || origin) {
            finalStreamUrl = `/api/video-proxy?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}`;
          }

          setStreamUrls((prev) => ({ ...prev, [idx]: finalStreamUrl }));
          return finalStreamUrl;
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

  // 3. Pre-fetch streams for adjacent episodes to ensure synchronous dynamic source loading (Fixes Autoplay on manual scroll)
  useEffect(() => {
    if (episodes.length === 0) return;

    const indicesToFetch = [
      currentEpisodeIdx,
      currentEpisodeIdx + 1,
      currentEpisodeIdx - 1
    ].filter(idx => idx >= 0 && idx < episodes.length);

    indicesToFetch.forEach(idx => {
      const ep = episodes[idx];
      if (ep && !streamUrls[idx]) {
        fetchStreamData(idx, ep.videoFakeId);
      }
    });
  }, [currentEpisodeIdx, episodes, streamUrls]);

  // Synchronize Active Subtitle Text and Current Time state on Video Time Update
  const handleTimeUpdate = (idx: number, videoEl: HTMLVideoElement) => {
    if (idx !== currentEpisodeIdxRef.current) return;
    
    const time = videoEl.currentTime;
    setCurrentTime(time);
    
    if (videoEl.duration) {
      setDuration(videoEl.duration);
    }

    const cues = parsedCues[idx];
    if (!cues || cues.length === 0) {
      setActiveSubtitleText("");
      return;
    }

    const matchingCue = cues.find((c) => time >= c.start && time <= c.end);
    if (matchingCue) {
      setActiveSubtitleText(matchingCue.text);
    } else {
      setActiveSubtitleText("");
    }
  };

  // Handle Seek Drag/Click from Timeline Progress Bar
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    
    const activeVideo = videoRefs.current[currentEpisodeIdx];
    if (activeVideo) {
      activeVideo.currentTime = newTime;
    }
    resetControlsTimer();
  };

  // Play Video with HLS support & pause all others
  const playVideo = async (idx: number) => {
    if (idx !== currentEpisodeIdxRef.current) return;

    const ep = episodes[idx];
    if (!ep) return;

    const videoEl = videoRefs.current[idx];
    if (!videoEl) return;

    const url = await fetchStreamData(idx, ep.videoFakeId);
    if (!url) return;

    if (idx !== currentEpisodeIdxRef.current) {
      videoEl.pause();
      return;
    }

    pauseAllExcept(idx);

    if (url.includes(".m3u8") && Hls.isSupported()) {
      if (!hlsInstances.current[idx]) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(videoEl);
        hlsInstances.current[idx] = hls;
      }
    } else {
      const absoluteUrl = url.startsWith("http") ? url : new URL(url, window.location.href).href;
      if (videoEl.src !== absoluteUrl) {
        videoEl.src = url;
      }
    }

    videoEl.play().then(() => {
      setIsPlaying((prev) => ({ ...prev, [idx]: true }));
      setIsBuffering((prev) => ({ ...prev, [idx]: false }));
    }).catch(() => {
      // Autoplay blocked by browser policy (sound needs gesture). Show play overlay button.
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

  // Toggle Play/Pause on Video Click (Instant Resume support with Controls protection)
  const togglePlay = (idx: number) => {
    const video = videoRefs.current[idx];
    if (!video) return;

    // 1. If controls are hidden, show them first instead of pausing playback (Netflix UX style)
    if (!showControls) {
      setShowControls(true);
      resetControlsTimer();
      return;
    }

    // 2. Playback state toggle
    if (video.paused) {
      // Prevent frozen player: if video is at/near the end, rewind to beginning
      if (video.currentTime >= (video.duration || 0) - 0.25) {
        video.currentTime = 0;
      }

      if (video.src) {
        video.play().then(() => {
          setIsPlaying((prev) => ({ ...prev, [idx]: true }));
        }).catch(() => {});
      } else {
        playVideo(idx);
      }
    } else {
      video.pause();
      setIsPlaying((prev) => ({ ...prev, [idx]: false }));
    }
    resetControlsTimer();
  };

  // Select Episode from Drawer
  const selectEpisode = (index: number) => {
    isProgrammaticScrolling.current = true;
    pauseAllExcept(index);
    setCurrentEpisodeIdx(index);

    const container = containerRef.current;
    if (container) {
      container.scrollTo({
        top: container.clientHeight * index,
        behavior: "smooth",
      });
    }

    setTimeout(() => {
      isProgrammaticScrolling.current = false;
      playVideo(index);
    }, 800);

    notify(`Memutar Episode ${index + 1}`);
  };

  // Auto-advance to next episode when video ends naturally (Fixes looping Bug 1)
  const handleVideoEnded = (idx: number) => {
    const nextIdx = idx + 1;
    if (nextIdx < episodes.length) {
      selectEpisode(nextIdx);
      notify(`Memutar otomatis Episode ${nextIdx + 1}`);
    } else {
      notify("Anda telah selesai menonton semua episode!");
    }
  };

  // Handle Share Action
  const handleShare = (episode: number) => {
    const shareTitle = detail?.title || "Nonton MiniDrama";
    const shareText = `Yuk nonton drama "${detail?.title || "MiniDrama"}" - Episode ${episode} gratis Subtitle Indonesia di MiniDrama!`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      notify("Tautan disalin ke clipboard!");
    }
  };

  // Handle Report Link
  const handleReport = (episode: number) => {
    const telegramUsername = "minidrama_support"; 
    const telegramUrl = `https://t.me/${telegramUsername}`;
    window.open(telegramUrl, "_blank");
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
    /* h-[100dvh] solves the mobile browser cut-off issue (Fixes Bug 6) */
    <div className="relative h-[100dvh] w-full bg-black text-white overflow-hidden max-w-lg mx-auto shadow-2xl">
      
      {/* Toast Notification Banner */}
      {showNotification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-rose-500/90 text-white font-bold text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur animate-fade-in flex items-center gap-1.5 border border-rose-400/40">
          <Sparkles className="h-3.5 w-3.5" />
          {showNotification}
        </div>
      )}

      {/* Top Header Buttons (Hides on auto-hide) */}
      <div 
        className={cn(
          "absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none transition-all duration-300 transform",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        )}
      >
        <button
          onClick={() => router.back()}
          className="pointer-events-auto p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/80 transition-colors border border-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
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
                muted={isMuted}
                playsInline
                preload="metadata"
                onClick={() => togglePlay(idx)}
                onTimeUpdate={(e) => {
                  handleTimeUpdate(idx, e.target as HTMLVideoElement);
                }}
                onLoadedMetadata={(e) => {
                  if (isCurrent) setDuration((e.target as HTMLVideoElement).duration || 0);
                }}
                onWaiting={() => {
                  if (isCurrent) setIsBuffering((prev) => ({ ...prev, [idx]: true }));
                }}
                onPlaying={() => {
                  setIsBuffering((prev) => ({ ...prev, [idx]: false }));
                  setIsPlaying((prev) => ({ ...prev, [idx]: true }));
                  if (isCurrent) {
                    const videoEl = videoRefs.current[idx];
                    if (videoEl) setDuration(videoEl.duration || 0);
                  }
                }}
                onPause={() => setIsPlaying((prev) => ({ ...prev, [idx]: false }))}
                onEnded={() => handleVideoEnded(idx)}
                onError={() => {
                  setIsBuffering((prev) => ({ ...prev, [idx]: false }));
                  setIsPlaying((prev) => ({ ...prev, [idx]: false }));
                }}
                className="w-full h-full object-cover cursor-pointer"
              />

              {/* Loading Spinner */}
              {isEpBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none z-25">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 text-rose-500 animate-spin" />
                    <span className="text-xs font-semibold text-zinc-300">Memuat Stream...</span>
                  </div>
                </div>
              )}

              {/* Center Play Overlay Icon when Paused (Protected by showControls) */}
              {!isEpPlaying && !isEpBuffering && isCurrent && showControls && (
                <div
                  onClick={() => togglePlay(idx)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-20"
                >
                  <div className="p-5 rounded-full bg-rose-500/90 text-white shadow-2xl scale-110 hover:scale-125 transition-transform flex items-center justify-center">
                    <Play className="h-8 w-8 fill-current ml-1" />
                  </div>
                </div>
              )}

              {/* Subtitle Overlay - Smoothly animates downwards when controls hide (Fixes Bug 5) */}
              {isCurrent && activeSubtitleText && (
                <div 
                  className={cn(
                    "absolute left-4 right-16 z-30 flex justify-center pointer-events-none transition-all duration-300",
                    showControls ? "bottom-[180px]" : "bottom-[90px]"
                  )}
                >
                  <div className="bg-black/90 backdrop-blur-md text-yellow-300 font-extrabold text-sm md:text-base px-4 py-2 rounded-2xl text-center shadow-2xl border border-yellow-500/40 max-w-xs leading-snug tracking-wide animate-fade-in">
                    {activeSubtitleText}
                  </div>
                </div>
              )}

              {/* Right Sidebar Actions (Always visible, doesn't block main space) */}
              <div className="absolute right-4 bottom-32 z-30 flex flex-col gap-6 items-center">
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
                  onClick={toggleBookmark}
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

                {/* Share (Bagikan) */}
                <button
                  onClick={() => handleShare(epItem.episode)}
                  className="flex flex-col items-center gap-1 group pointer-events-auto"
                >
                  <div className="p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 group-active:scale-90 transition-transform">
                    <Share2 className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-bold drop-shadow">Bagikan</span>
                </button>

                {/* Report (Lapor) */}
                <button
                  onClick={() => handleReport(epItem.episode)}
                  className="flex flex-col items-center gap-1 group pointer-events-auto"
                >
                  <div className="p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 group-active:scale-90 transition-transform">
                    <AlertTriangle className="h-5 w-5 text-zinc-400" />
                  </div>
                  <span className="text-[9px] font-semibold text-zinc-400">Lapor</span>
                </button>
              </div>

              {/* Bottom Video Metadata - Slides down when controls hide (Fixes Bug 5) */}
              <div 
                className={cn(
                  "absolute left-4 right-20 z-30 flex flex-col gap-1.5 transition-all duration-300",
                  showControls ? "bottom-[124px]" : "bottom-[34px]"
                )}
              >
                <h4 className="text-sm md:text-base font-black leading-tight drop-shadow text-zinc-100 flex items-center gap-2">
                  <span className="text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider flex-shrink-0">
                    EP {epItem.episode}
                  </span>
                  <span className="line-clamp-2">{detail?.title || "Memuat Judul..."}</span>
                </h4>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Progress Bar & Seek Bar - Positioned dynamically, fades out on play (Fixes Bug 5) */}
      <div 
        className={cn(
          "absolute left-4 right-4 z-40 flex flex-col gap-1.5 pointer-events-auto bg-black/60 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/5 shadow-xl transition-all duration-300 transform",
          showControls ? "bottom-[72px] opacity-100 scale-100" : "bottom-[20px] opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-black px-0.5">
          <span className="text-rose-400">{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="relative w-full h-1 bg-zinc-800 rounded-full group cursor-pointer">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />
          {/* Custom Track representation */}
          <div 
            className="absolute left-0 top-0 bottom-0 bg-rose-500 rounded-full z-10"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
          {/* Thumb circle */}
          <div 
            className="absolute h-3 w-3 rounded-full bg-white border-2 border-rose-500 -top-1 shadow shadow-rose-500/50 z-10 transition-transform group-hover:scale-125"
            style={{ 
              left: `${duration ? (currentTime / duration) * 100 : 0}%`,
              transform: 'translateX(-50%)'
            }}
          />
        </div>
      </div>

      {/* Episode Selector Drawer Trigger - Fades out on play, positioned perfectly on dynamic viewports (Fixes Bug 5 & Bug 6) */}
      <div 
        className={cn(
          "absolute left-0 right-0 z-40 flex justify-center pointer-events-none transition-all duration-300 transform",
          showControls ? "bottom-4 opacity-100 scale-100" : "-bottom-12 opacity-0 scale-95 pointer-events-none"
        )}
      >
        <Drawer>
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              className="pointer-events-auto text-xs font-bold gap-1.5 text-white bg-rose-500/90 hover:bg-rose-600 backdrop-blur px-5 py-2 rounded-full border border-rose-400/40 shadow-xl shadow-rose-500/20"
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
