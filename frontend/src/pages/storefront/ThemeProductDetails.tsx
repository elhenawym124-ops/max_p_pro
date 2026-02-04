
import React from 'react';
import { useStoreTheme } from '../../hooks/useStoreTheme';
import ProductDetails from './ProductDetails';
import ProductDetailsMinimal from './ProductDetailsMinimal';

const ThemeProductDetails: React.FC = () => {
    const { themeType } = useStoreTheme();

    switch (themeType) {
        case 'minimal':
            return <ProductDetailsMinimal />;
        case 'modern':
            return <ProductDetails />; // Fallback to default for now
        case 'default':
        default:
            return <ProductDetails />;
    }
};

export default ThemeProductDetails;
