"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaSlide {
  id: string;
  type: "video" | "image";
  src: string;
  stockVideoSrc?: string;
  fallbackSrc?: string;
  alt: string;
}

const DEFAULT_SLIDES: MediaSlide[] = [
  {
    id: "hero-video-main",
    type: "video",
    src: "/hero/main.mp4",
    fallbackSrc: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1600&auto=format&fit=crop",
    alt: "Showing Agrotourism in India",
  },
  {
    id: "hero-video-1",
    type: "video",
    src: "/hero/video.mp4",
    fallbackSrc: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop",
    alt: "Aerial view of lush green rural farm fields",
  },
  {
    id: "hero-img-1",
    type: "image",
    src: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1600&auto=format&fit=crop",
    alt: "Scenic mountain terrace farm",
  },
  {
    id: "hero-img-2",
    type: "image",
    src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1600&auto=format&fit=crop",
    alt: "Organic apple orchard mist",
  },
  {
    id: "hero-img-3",
    type: "image",
    src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1600&auto=format&fit=crop",
    alt: "Himalayan farmstay sunset",
  },
  {
    id: "hero-img-4",
    type: "image",
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1600&auto=format&fit=crop",
    alt: "Rural eco-tourism landscape",
  },
];

interface HeroCarouselProps {
  children: React.ReactNode;
}

export function HeroCarousel({ children }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const totalSlides = DEFAULT_SLIDES.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Auto-advance timer (7.5s) when not hovered or interacting
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 7500);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  // Ensure active video is playing
  useEffect(() => {
    const currentSlide = DEFAULT_SLIDES[currentIndex];
    if (currentSlide.type === "video") {
      const vid = videoRefs.current[currentSlide.id];
      if (vid) {
        vid.play().catch(() => {
          // Autoplay handled
        });
      }
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <section
      className="relative isolate overflow-hidden min-h-[580px] sm:min-h-[640px] lg:min-h-[700px] flex items-center justify-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Media Container */}
      <div className="absolute inset-0 -z-20 overflow-hidden bg-black">
        {DEFAULT_SLIDES.map((slide, index) => {
          const isActive = index === currentIndex;
          const hasFailed = failedImages[slide.id];
          const imgSrc = hasFailed && slide.fallbackSrc ? slide.fallbackSrc : slide.src;

          return (
            <div
              key={slide.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-1000 ease-in-out overflow-hidden",
                isActive ? "opacity-100 z-0 scale-100" : "opacity-0 -z-10 scale-105 pointer-events-none"
              )}
            >
              {slide.type === "video" ? (
                <video
                  ref={(el) => {
                    videoRefs.current[slide.id] = el;
                  }}
                  autoPlay={isActive}
                  loop
                  muted
                  playsInline
                  preload={isActive ? "auto" : "none"}
                  poster={slide.fallbackSrc}
                  className="size-full object-cover"
                >
                  {(isActive || Math.abs(index - currentIndex) <= 1) && (
                    <source src={slide.src} type="video/mp4" />
                  )}
                </video>
              ) : (
                <img
                  src={imgSrc}
                  alt={slide.alt}
                  onError={() => handleImageError(slide.id)}
                  className="size-full object-cover"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-black/15 to-black/20" />


      <button
        type="button"
        onClick={prevSlide}
        aria-label="Previous slide"
        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 flex size-11 sm:size-13 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md border border-white/20 hover:bg-white hover:text-ink transition-all shadow-lg hover:scale-105 cursor-pointer"
      >
        <ChevronLeft size={26} />
      </button>

      {/* Right Arrow Button */}
      <button
        type="button"
        onClick={nextSlide}
        aria-label="Next slide"
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 flex size-11 sm:size-13 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md border border-white/20 hover:bg-white hover:text-ink transition-all shadow-lg hover:scale-105 cursor-pointer"
      >
        <ChevronRight size={26} />
      </button>

      {/* Hero Content (Headings & Search Form) */}
      <div className="w-full relative z-10">{children}</div>

      {/* Bottom Navigation Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
        {DEFAULT_SLIDES.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={`dot-${slide.id}`}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300 cursor-pointer",
                isActive
                  ? "w-8 bg-brand-500 shadow-sm"
                  : "w-2.5 bg-white/40 hover:bg-white/70"
              )}
            />
          );
        })}
      </div>
    </section>
  );
}
