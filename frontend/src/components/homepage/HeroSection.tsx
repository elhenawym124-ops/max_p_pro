import React from 'react';
import { Link } from 'react-router-dom';

interface HeroSectionProps {
  section: any;
  settings: any;
}

const HeroSection: React.FC<HeroSectionProps> = ({ section, settings }) => {
  const slides = section.slides || [section];
  const [currentSlide, setCurrentSlide] = React.useState(0);

  React.useEffect(() => {
    if (slides.length > 1 && section.autoplay) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, section.autoplaySpeed || 5000);
      return () => clearInterval(interval);
    }
  }, [slides.length, section.autoplay, section.autoplaySpeed]);

  const currentSlideData = slides[currentSlide];

  return (
    <div className="relative w-full overflow-hidden" style={{
      height: section.height === 'large' ? '600px' : section.height === 'medium' ? '450px' : '500px'
    }}>
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
        style={{
          backgroundImage: `url(${currentSlideData.backgroundImage})`,
        }}
      >
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: currentSlideData.overlayOpacity || 0.3 }}
        />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center">
        <div className="container mx-auto px-4">
          <div className={`max-w-2xl ${
            currentSlideData.textAlign === 'center' ? 'mx-auto text-center' : 
            currentSlideData.textAlign === 'right' ? 'mr-0 text-right' : 
            'text-left'
          }`}>
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-fade-in"
              style={{ 
                color: currentSlideData.textColor || '#ffffff',
                fontFamily: settings.typography?.headingFont || 'inherit'
              }}
            >
              {currentSlideData.title}
            </h1>
            <p 
              className="text-lg md:text-xl mb-8 animate-fade-in-delay"
              style={{ color: currentSlideData.textColor || '#ffffff' }}
            >
              {currentSlideData.subtitle}
            </p>
            <Link
              to={currentSlideData.buttonLink || '/shop'}
              className="inline-block px-8 py-4 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105 animate-fade-in-delay-2"
              style={{
                backgroundColor: settings.colorScheme?.primary || '#4F46E5',
                color: '#ffffff'
              }}
            >
              {currentSlideData.buttonText || 'تسوق الآن'}
            </Link>
          </div>
        </div>
      </div>

      {/* Slider Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
          {slides.map((_: any, index: number) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroSection;
