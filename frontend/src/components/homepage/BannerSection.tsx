import React from 'react';
import { Link } from 'react-router-dom';

interface BannerSectionProps {
  section: any;
  settings: any;
}

const BannerSection: React.FC<BannerSectionProps> = ({ section, settings }) => {
  return (
    <div className="relative w-full overflow-hidden my-8" style={{
      height: section.height === 'large' ? '400px' : section.height === 'medium' ? '300px' : '350px'
    }}>
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${section.backgroundImage})`,
          backgroundColor: section.backgroundColor || '#000000'
        }}
      >
        {section.overlay && (
          <div 
            className="absolute inset-0 bg-black"
            style={{ opacity: section.overlayOpacity || 0.5 }}
          />
        )}
      </div>

      <div className="relative h-full flex items-center">
        <div className="container mx-auto px-4">
          <div className={`max-w-2xl ${
            section.textAlign === 'center' ? 'mx-auto text-center' : 
            section.textAlign === 'right' ? 'mr-0 text-right' : 
            'text-left'
          }`}>
            <h2 
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: section.textColor || '#ffffff' }}
            >
              {section.title}
            </h2>
            {section.subtitle && (
              <p 
                className="text-lg md:text-xl mb-6"
                style={{ color: section.textColor || '#ffffff' }}
              >
                {section.subtitle}
              </p>
            )}
            <Link
              to={section.buttonLink || '/shop'}
              className="inline-block px-6 py-3 font-semibold rounded-lg transition-all text-white hover:opacity-90 dark:hover:opacity-80"
              style={{
                backgroundColor: settings.colorScheme?.primary || '#4F46E5',
                color: '#ffffff'
              }}
            >
              {section.buttonText || 'تسوق الآن'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerSection;
