
import { useState, useEffect } from 'react';

// We reuse the interface for consistency
export interface ThemeConfig {
    id: string;
    name: string;
    type: 'default' | 'minimal' | 'modern'; // Added type for logical switching
}

export const useStoreTheme = () => {
    const [activeThemeId, setActiveThemeId] = useState<string>('1');
    const [themeType, setThemeType] = useState<'default' | 'minimal' | 'modern'>('default');

    useEffect(() => {
        // In a real app, this value would come from the company public settings API
        // For now we read from the localStorage where StoreThemeSettings saves it
        const saved = localStorage.getItem('storefront_theme_id');
        if (saved) {
            setActiveThemeId(saved);

            // Improve mapping logic
            if (saved === '1') setThemeType('default');
            else if (saved === '2') setThemeType('modern');
            else if (saved === '3') setThemeType('minimal');
            else setThemeType('default');
        }
    }, []);

    return { activeThemeId, themeType };
};
