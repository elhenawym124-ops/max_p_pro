import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from './button';
import { useTheme } from '../../hooks/useTheme';

const ThemeToggle: React.FC = () => {
  const { derivedTheme, toggleTheme } = useTheme();

  const isDark = derivedTheme === 'dark';

  return (
    <Button
      onClick={toggleTheme}
      variant="ghost"
      size="sm"
      className="w-9 h-9 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={isDark ? 'تبديل للوضع النهاري' : 'تبديل للوضع الليلي'}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-yellow-500 transition-all hover:text-yellow-600" />
      ) : (
        <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400 transition-all hover:text-gray-900 dark:hover:text-gray-200" />
      )}
    </Button>
  );
};

export default ThemeToggle;
