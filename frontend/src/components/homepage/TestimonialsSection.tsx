import React from 'react';
import { StarIcon } from '@heroicons/react/24/solid';

interface TestimonialsSectionProps {
  section: any;
  settings: any;
}

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ section }) => {
  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {section.title && (
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">{section.title}</h2>
            {section.subtitle && (
              <p className="text-gray-600">{section.subtitle}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {section.items?.map((item: any, index: number) => (
            <div key={index} className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                {item.avatar && (
                  <img
                    src={item.avatar}
                    alt={item.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                )}
                <div>
                  <h4 className="font-semibold">{item.name}</h4>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`w-4 h-4 ${
                          i < item.rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-700">{item.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestimonialsSection;
