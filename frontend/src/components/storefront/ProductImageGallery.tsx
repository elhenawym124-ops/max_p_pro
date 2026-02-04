import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, MagnifyingGlassPlusIcon, PlayIcon } from '@heroicons/react/24/outline';
import { StorefrontSettings } from '../../services/storefrontSettingsService';

interface VideoItem {
  url: string;
  videoType: 'youtube' | 'vimeo' | 'self-hosted';
  thumbnail?: string;
}

interface ProductImageGalleryProps {
  images: string[];
  videos?: VideoItem[];
  alt: string;
  settings: Partial<StorefrontSettings>;
  className?: string;
}

type MediaItem = 
  | { type: 'image'; url: string }
  | { type: 'video'; url: string; videoType: 'youtube' | 'vimeo' | 'self-hosted'; thumbnail?: string | undefined };

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  images,
  videos = [],
  alt,
  settings,
  className = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [_mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  const mainImageRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // Combine images and videos
  const allMedia: MediaItem[] = [
    ...images.map(img => ({ type: 'image' as const, url: img })),
    ...videos.map(vid => ({ type: 'video' as const, url: vid.url, videoType: vid.videoType, thumbnail: vid.thumbnail })),
  ];

  // Sort videos based on position setting
  const sortedMedia = [...allMedia];
  if (settings?.videoPosition === 'start') {
    sortedMedia.sort((a) => (a.type === 'video' ? -1 : 1));
  } else if (settings?.videoPosition === 'end') {
    sortedMedia.sort((a) => (a.type === 'video' ? 1 : -1));
  }

  const currentMedia = sortedMedia[selectedIndex];
  const totalItems = sortedMedia.length;

  // Autoplay functionality
  useEffect(() => {
    if (settings?.sliderEnabled && settings?.sliderAutoplay && totalItems > 1) {
      autoplayRef.current = setInterval(() => {
        goToNext();
      }, settings?.sliderAutoplaySpeed || 3000);

      return () => {
        if (autoplayRef.current) clearInterval(autoplayRef.current);
      };
    }
    return undefined;
  }, [settings?.sliderAutoplay, settings?.sliderAutoplaySpeed, totalItems, selectedIndex]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!showLightbox || !settings?.lightboxKeyboardNav) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      else if (e.key === 'ArrowRight') goToNext();
      else if (e.key === 'Escape') setShowLightbox(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLightbox, settings?.lightboxKeyboardNav]);

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    if (settings?.sliderInfiniteLoop) {
      setSelectedIndex((prev) => (prev + 1) % totalItems);
    } else {
      setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
    }
    
    setTimeout(() => setIsTransitioning(false), settings?.sliderTransitionSpeed || 300);
  }, [totalItems, settings?.sliderInfiniteLoop, settings?.sliderTransitionSpeed, isTransitioning]);

  const goToPrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    if (settings?.sliderInfiniteLoop) {
      setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    }
    
    setTimeout(() => setIsTransitioning(false), settings?.sliderTransitionSpeed || 300);
  }, [totalItems, settings?.sliderInfiniteLoop, settings?.sliderTransitionSpeed, isTransitioning]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!settings?.mobileSwipeEnabled) return;
    const touch = e.touches[0];
    if (touch) setTouchStart(touch.clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!settings?.mobileSwipeEnabled || touchStart === null) return;
    
    const touch = e.changedTouches[0];
    if (!touch) return;
    const touchEnd = touch.clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNext();
      else goToPrev();
    }
    
    setTouchStart(null);
  };

  // Zoom handlers
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!settings?.imageZoomEnabled || !mainImageRef.current) return;
    
    const rect = mainImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setMousePosition({ x: e.clientX, y: e.clientY });
    setZoomPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const handleMouseEnter = () => {
    if (settings?.imageZoomEnabled && (settings?.imageZoomType === 'hover' || settings?.imageZoomType === 'both')) {
      setShowZoom(true);
    }
  };

  const handleMouseLeave = () => {
    if (settings?.imageZoomType === 'hover' || settings?.imageZoomType === 'both') {
      setShowZoom(false);
    }
  };

  const handleImageClick = () => {
    if (settings?.imageZoomEnabled && (settings?.imageZoomType === 'click' || settings?.imageZoomType === 'both')) {
      if (settings?.zoomStyle === 'fullscreen' || settings?.lightboxEnabled) {
        setShowLightbox(true);
      } else {
        setShowZoom(!showZoom);
      }
    } else if (settings?.lightboxEnabled) {
      setShowLightbox(true);
    } else if (settings?.mobileFullscreenOnTap) {
      setShowLightbox(true);
    }
  };

  // Get thumbnail size
  const getThumbnailSize = () => {
    switch (settings?.thumbnailSize) {
      case 'small': return 'h-14 w-14';
      case 'large': return 'h-24 w-24';
      default: return 'h-20 w-20';
    }
  };

  // Get aspect ratio class
  const getAspectRatioClass = () => {
    switch (settings?.mainImageAspectRatio) {
      case '4:3': return 'aspect-[4/3]';
      case '3:4': return 'aspect-[3/4]';
      case '16:9': return 'aspect-video';
      case 'auto': return '';
      default: return 'aspect-square';
    }
  };

  // Get transition class
  const getTransitionClass = () => {
    const speed = settings?.sliderTransitionSpeed || 300;
    switch (settings?.sliderTransitionEffect) {
      case 'fade': return `transition-opacity duration-[${speed}ms]`;
      case 'flip': return `transition-transform duration-[${speed}ms] transform-style-preserve-3d`;
      case 'cube': return `transition-transform duration-[${speed}ms]`;
      default: return `transition-transform duration-[${speed}ms]`;
    }
  };

  // Get hover effect class
  const getHoverEffectClass = () => {
    switch (settings?.imageHoverEffect) {
      case 'zoom': return 'hover:scale-105';
      case 'brightness': return 'hover:brightness-110';
      case 'shadow': return 'hover:shadow-2xl';
      default: return '';
    }
  };

  // Render thumbnail layout
  const renderThumbnails = () => {
    if (totalItems <= 1) return null;

    const layout = settings?.galleryLayout || 'bottom';
    const isVertical = layout === 'left' || layout === 'right';
    const thumbnailClass = getThumbnailSize();
    const spacing = settings?.thumbnailSpacing || 8;
    const borderRadius = settings?.thumbnailBorderRadius || 8;

    const thumbnailsContent = (
      <div 
        className={`flex ${isVertical ? 'flex-col' : 'flex-row flex-wrap'} gap-${Math.round(spacing / 4)}`}
        style={{ gap: `${spacing}px` }}
      >
        {sortedMedia.map((media, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={`${thumbnailClass} relative overflow-hidden transition-all duration-200 ${
              selectedIndex === index 
                ? 'ring-2 ring-indigo-600 ring-offset-2' 
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{ borderRadius: `${borderRadius}px` }}
          >
            {media.type === 'image' ? (
              <img
                src={media.url}
                alt={`${alt} ${index + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="relative w-full h-full bg-gray-200">
                {media.thumbnail && (
                  <img src={media.thumbnail} alt="" className="w-full h-full object-cover" />
                )}
                {settings?.videoThumbnailIcon && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <PlayIcon className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    );

    return thumbnailsContent;
  };

  // Render zoom window
  const renderZoomWindow = () => {
    if (!showZoom || !settings?.imageZoomEnabled || currentMedia?.type !== 'image') return null;

    const zoomLevel = settings?.zoomLevel || 2.5;
    const windowSize = settings?.zoomWindowSize || 400;
    const lensSize = settings?.zoomLensSize || 150;

    if (settings?.zoomStyle === 'lens') {
      const isCircle = settings?.zoomLensShape === 'circle';
      return (
        <div
          className="absolute pointer-events-none z-30 border-2 border-white shadow-lg overflow-hidden"
          style={{
            width: `${lensSize}px`,
            height: `${lensSize}px`,
            left: `${zoomPosition.x}%`,
            top: `${zoomPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            borderRadius: isCircle ? '50%' : '8px',
          }}
        >
          <img
            src={currentMedia.url}
            alt={alt}
            className="w-full h-full object-cover"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
            }}
          />
        </div>
      );
    }

    if (settings?.zoomStyle === 'side') {
      const position = settings?.zoomWindowPosition || 'right';
      const positionStyles: Record<string, React.CSSProperties> = {
        right: { left: '100%', top: 0, marginLeft: '16px' },
        left: { right: '100%', top: 0, marginRight: '16px' },
        top: { bottom: '100%', left: 0, marginBottom: '16px' },
        bottom: { top: '100%', left: 0, marginTop: '16px' },
      };

      return (
        <div
          className="absolute z-50 border-2 border-gray-200 rounded-lg overflow-hidden shadow-2xl bg-white"
          style={{
            width: `${windowSize}px`,
            height: `${windowSize}px`,
            ...positionStyles[position],
          }}
        >
          <img
            src={currentMedia.url}
            alt={alt}
            className="w-full h-full object-cover"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
            }}
          />
        </div>
      );
    }

    if (settings?.zoomStyle === 'inner') {
      return (
        <div className="absolute inset-0 z-20 overflow-hidden">
          <img
            src={currentMedia.url}
            alt={alt}
            className="w-full h-full object-cover"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
            }}
          />
        </div>
      );
    }

    return null;
  };

  // Render lightbox
  const renderLightbox = () => {
    if (!showLightbox) return null;

    const bgColor = settings?.lightboxBackgroundColor || 'rgba(0,0,0,0.9)';

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: bgColor }}
        onClick={(e) => {
          if (settings?.lightboxCloseOnOverlay && e.target === e.currentTarget) {
            setShowLightbox(false);
          }
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setShowLightbox(false)}
          className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors z-10"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Counter */}
        {settings?.lightboxShowCounter && totalItems > 1 && (
          <div className="absolute top-4 left-4 px-3 py-1 bg-white/20 rounded-full text-white text-sm">
            {selectedIndex + 1} / {totalItems}
          </div>
        )}

        {/* Navigation arrows */}
        {settings?.lightboxShowArrows && totalItems > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            >
              <ChevronLeftIcon className="w-8 h-8" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            >
              <ChevronRightIcon className="w-8 h-8" />
            </button>
          </>
        )}

        {/* Main content */}
        <div className="max-w-7xl max-h-[85vh] w-full mx-4">
          {currentMedia?.type === 'image' ? (
            <img
              src={currentMedia.url}
              alt={alt}
              className={`max-w-full max-h-[85vh] object-contain mx-auto ${
                settings?.lightboxZoomEnabled ? 'cursor-zoom-in' : ''
              }`}
            />
          ) : (
            <div className="aspect-video w-full w-full">
              {/* Video player would go here */}
              <div className="w-full h-full bg-black flex items-center justify-center text-white">
                Video Player
              </div>
            </div>
          )}
        </div>

        {/* Thumbnails in lightbox */}
        {settings?.lightboxShowThumbnails && totalItems > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-lg">
            {sortedMedia.map((media, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`w-16 h-16 rounded overflow-hidden transition-all ${
                  selectedIndex === index ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                }`}
              >
                {media.type === 'image' ? (
                  <img src={media.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                    <PlayIcon className="w-6 h-6 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Main render
  const layout = settings?.galleryLayout || 'bottom';
  const borderRadius = settings?.imageBorderRadius || 8;

  const mainImageContent = (
    <div
      ref={mainImageRef}
      className={`relative overflow-hidden ${getAspectRatioClass()} ${getHoverEffectClass()} ${
        settings?.imageShadow ? 'shadow-lg' : ''
      } ${settings?.imageZoomEnabled ? 'cursor-zoom-in' : ''}`}
      style={{ borderRadius: `${borderRadius}px` }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleImageClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Loading skeleton */}
      {settings?.imageLoadingEffect === 'skeleton' && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Main image/video */}
      {currentMedia?.type === 'image' ? (
        <img
          src={currentMedia.url}
          alt={alt}
          className={`w-full h-full object-cover ${getTransitionClass()}`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.parentElement) {
              const placeholder = settings?.imagePlaceholder || '📦';
              e.currentTarget.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100"><span class="text-6xl">${placeholder}</span></div>`;
            }
          }}
        />
      ) : (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <PlayIcon className="w-16 h-16 text-white" />
        </div>
      )}

      {/* Zoom indicator */}
      {settings?.imageZoomEnabled && currentMedia?.type === 'image' && (
        <div className="absolute bottom-3 right-3 p-2 bg-black/50 rounded-full text-white opacity-60">
          <MagnifyingGlassPlusIcon className="w-5 h-5" />
        </div>
      )}

      {/* Navigation arrows on main image */}
      {settings?.sliderEnabled && settings?.sliderShowArrows && totalItems > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goToPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-md transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-800" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-md transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-800" />
          </button>
        </>
      )}

      {/* Dots navigation */}
      {settings?.sliderEnabled && settings?.sliderShowDots && totalItems > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {sortedMedia.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(index); }}
              className={`w-2 h-2 rounded-full transition-colors ${
                selectedIndex === index ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Zoom window */}
      {renderZoomWindow()}
    </div>
  );

  // Layout rendering
  if (layout === 'grid') {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-2 gap-2">
          {sortedMedia.slice(0, 5).map((media, index) => (
            <div
              key={index}
              className={`relative overflow-hidden cursor-pointer ${
                index === 0 ? 'col-span-2 row-span-2' : ''
              }`}
              style={{ borderRadius: `${borderRadius}px` }}
              onClick={() => { setSelectedIndex(index); setShowLightbox(true); }}
            >
              {media.type === 'image' ? (
                <img src={media.url} alt={`${alt} ${index + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <PlayIcon className="w-8 h-8 text-gray-600" />
                </div>
              )}
              {index === 4 && totalItems > 5 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xl font-bold">
                  +{totalItems - 5}
                </div>
              )}
            </div>
          ))}
        </div>
        {renderLightbox()}
      </div>
    );
  }

  const isVertical = layout === 'left' || layout === 'right';

  return (
    <div className={`${className}`}>
      <div className={`flex ${isVertical ? 'flex-row' : 'flex-col'} gap-4`}>
        {/* Thumbnails (left/top) */}
        {(layout === 'left' || layout === 'top') && renderThumbnails()}

        {/* Main image */}
        <div className="flex-1">
          {mainImageContent}
        </div>

        {/* Thumbnails (right/bottom) */}
        {(layout === 'right' || layout === 'bottom') && renderThumbnails()}
      </div>

      {/* Lightbox */}
      {renderLightbox()}
    </div>
  );
};

export default ProductImageGallery;

