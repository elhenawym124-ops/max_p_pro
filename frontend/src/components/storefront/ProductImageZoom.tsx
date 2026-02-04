import React, { useState, useRef, useEffect } from 'react';

interface ProductImageZoomProps {
  images: string[];
  alt: string;
  enabled: boolean;
  zoomType: 'hover' | 'click' | 'both';
  className?: string;
}

const ProductImageZoom: React.FC<ProductImageZoomProps> = ({
  images,
  alt,
  enabled,
  zoomType,
  className = '',
}) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [showZoom, setShowZoom] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!imageRef.current) return;

      const rect = imageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      setMousePosition({ x: e.clientX, y: e.clientY });
      setZoomPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    };

    const handleMouseEnter = () => {
      if (zoomType === 'hover' || zoomType === 'both') {
        setShowZoom(true);
      }
    };

    const handleMouseLeave = () => {
      if (zoomType === 'hover' || zoomType === 'both') {
        setShowZoom(false);
      }
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (zoomType === 'click' || zoomType === 'both') {
        setShowZoom(!showZoom);
      }
    };

    const element = imageRef.current;
    if (element) {
      // إضافة event listeners حسب نوع التكبير
      if (zoomType === 'hover' || zoomType === 'both') {
        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);
      }
      if (zoomType === 'click' || zoomType === 'both') {
        element.addEventListener('click', handleClick);
      }
    }

    return () => {
      if (element) {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseenter', handleMouseEnter);
        element.removeEventListener('mouseleave', handleMouseLeave);
        element.removeEventListener('click', handleClick);
      }
    };
  }, [enabled, zoomType, selectedImage]);

  if (!enabled || images.length === 0) {
    // Fallback to normal image display
    return (
      <div className={className}>
        <img
          src={images[selectedImage] || images[0]}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const currentImage = images[selectedImage] || images[0];

  return (
    <div className={`relative ${className}`}>
      {/* Main Image Container */}
      <div
        ref={imageRef}
        className="relative w-full h-full overflow-hidden cursor-zoom-in"
      >
        <img
          src={currentImage}
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.parentElement) {
              e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><span class="text-6xl">📦</span></div>';
            }
          }}
        />

        {/* Zoom Overlay (for hover) */}
        {showZoom && (zoomType === 'hover' || zoomType === 'both') && (
          <div
            ref={zoomRef}
            className="fixed z-50 pointer-events-none"
            style={{
              left: `${mousePosition.x + 20}px`,
              top: `${mousePosition.y + 20}px`,
              width: '400px',
              height: '400px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              backgroundColor: 'white',
            }}
          >
            <img
              src={currentImage}
              alt={alt}
              className="w-full h-full object-cover"
              style={{
                transform: 'scale(2)',
                transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Full Screen Zoom Modal (for click) */}
      {showZoom && (zoomType === 'click' || zoomType === 'both') && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setShowZoom(false)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full">
            <img
              src={currentImage}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain mx-auto"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setShowZoom(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all hover:scale-110"
              aria-label="إغلاق"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 mt-4">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedImage(index);
                setShowZoom(false);
              }}
              className={`bg-gray-100 rounded-lg overflow-hidden border-2 transition-colors ${
                selectedImage === index ? 'border-indigo-600' : 'border-transparent'
              }`}
            >
              <img
                src={image}
                alt={`${alt} ${index + 1}`}
                className="w-full h-20 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageZoom;

