import React, { useState } from 'react';
import { LanguageIcon } from '@heroicons/react/24/outline';

interface LanguageSwitcherProps {
  enabled: boolean;
  currentLanguage: string;
  supportedLanguages: string[];
  onLanguageChange: (lang: string) => void;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  enabled,
  currentLanguage,
  supportedLanguages,
  onLanguageChange
}) => {
  if (!enabled || supportedLanguages.length <= 1) return null;

  const languageNames: Record<string, string> = {
    ar: 'العربية',
    en: 'English',
    fr: 'Français'
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <LanguageIcon className="h-5 w-5" />
        <span className="text-sm font-medium">{languageNames[currentLanguage] || currentLanguage}</span>
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] z-50">
          {supportedLanguages.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                onLanguageChange(lang);
                setIsOpen(false);
              }}
              className={`w-full text-right px-4 py-2 hover:bg-gray-50 ${
                currentLanguage === lang ? 'bg-indigo-50 text-indigo-600' : ''
              }`}
            >
              {languageNames[lang] || lang}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;

