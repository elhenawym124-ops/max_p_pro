import React from 'react';
import { 
  TruckIcon, 
  ShieldCheckIcon, 
  ClockIcon, 
  ArrowPathIcon,
  GiftIcon 
} from '@heroicons/react/24/outline';

interface FeaturesSectionProps {
  section: any;
  settings: any;
}

const iconMap: Record<string, any> = {
  truck: TruckIcon,
  'shield-check': ShieldCheckIcon,
  shield: ShieldCheckIcon,
  clock: ClockIcon,
  support: ClockIcon,
  'arrow-path': ArrowPathIcon,
  return: ArrowPathIcon,
  gift: GiftIcon,
};

// Default background colors for feature icons (matching the image)
const defaultBgColors = [
  '#E9D5FF', // Light purple - شحن مجاني
  '#A7F3D0', // Light green/teal - دفع آمن
  '#FED7AA', // Light orange/beige - دعم 24/7
  '#FBCFE8', // Light pink - إرجاع سهل
  '#DDD6FE', // Light purple (alternative) - هدايا مجانية
];

// Default icon colors (darker versions for contrast)
const defaultIconColors = [
  '#9333EA', // Purple
  '#059669', // Green/teal
  '#EA580C', // Orange
  '#DB2777', // Pink
  '#7C3AED', // Purple (alternative)
];

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ section, settings }) => {
  const items = section.items || [];
  const columns = Math.min(items.length, 5);
  
  return (
    <div 
      className="py-12 md:py-16"
      style={{ 
        backgroundColor: section.backgroundColor || settings.colorScheme?.background || '#f9fafb'
      }}
    >
      <div className="container mx-auto px-4">
        {section.title && (
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12" style={{
            color: settings.colorScheme?.text || '#1a1a1a',
            fontFamily: settings.typography?.headingFont || 'inherit'
          }}>
            {section.title}
          </h2>
        )}

        <div className={`grid gap-6 md:gap-8 ${
          items.length === 1 ? 'grid-cols-1' :
          items.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
          items.length === 3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' :
          items.length === 4 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4' :
          'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
        }`}>
          {items.map((item: any, index: number) => {
            const Icon = iconMap[item.icon] || TruckIcon;
            // Use item colors or default colors from arrays
            const iconBgColor = item.iconBgColor || item.iconColor || defaultBgColors[index % defaultBgColors.length];
            const iconColor = item.iconColor || defaultIconColors[index % defaultIconColors.length];
            
            return (
              <div 
                key={index}
                className="text-center group"
              >
                {/* Icon Circle */}
                <div className="flex justify-center mb-4">
                  <div 
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                    style={{
                      backgroundColor: iconBgColor,
                    }}
                  >
                    <Icon 
                      className="w-10 h-10 md:w-12 md:h-12"
                      style={{ color: iconColor }}
                    />
                  </div>
                </div>
                
                {/* Title */}
                <h3 
                  className="text-base md:text-lg font-bold mb-2 leading-tight" 
                  style={{
                    color: settings.colorScheme?.text || '#1a1a1a',
                    fontFamily: settings.typography?.headingFont || 'inherit'
                  }}
                >
                  {item.title}
                </h3>
                
                {/* Description */}
                <p 
                  className="text-sm md:text-base leading-relaxed" 
                  style={{
                    color: settings.colorScheme?.muted || '#6b7280',
                    fontFamily: settings.typography?.bodyFont || 'inherit'
                  }}
                >
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeaturesSection;
