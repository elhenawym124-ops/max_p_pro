
import React from 'react';
import { useStoreTheme } from '../../hooks/useStoreTheme';
import Homepage from './Homepage';
import HomepageSimple from './HomepageSimple'; // We treat this as "Minimal"
// import HomepageModern from './HomepageModern'; // Future implementation

const ThemeHomepage: React.FC = () => {
    const { themeType } = useStoreTheme();

    console.log('🎨 [ThemeHomepage] Rendering theme type:', themeType);

    switch (themeType) {
        case 'minimal':
            return <HomepageSimple />;
        case 'modern':
            // For now, Modern falls back to Default until we build a specifically different layout
            // Or we could pass a "variant" prop to Homepage if it supported it
            return <Homepage />;
        case 'default':
        default:
            return <Homepage />;
    }
};

export default ThemeHomepage;
