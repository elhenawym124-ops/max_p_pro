import React from 'react';

interface ProductBadgesProps {
  enabled: boolean;
  product: {
    id: string;
    createdAt: string;
    stock: number;
    comparePrice?: number;
    price: number;
    isFeatured?: boolean;
  };
  settings: {
    badgeNew: boolean;
    badgeBestSeller: boolean;
    badgeOnSale: boolean;
    badgeOutOfStock: boolean;
  };
}

const ProductBadges: React.FC<ProductBadgesProps> = ({
  enabled,
  product,
  settings
}) => {
  if (!enabled) return null;

  const badges: Array<{ label: string; className: string }> = [];

  // New badge (created within last 30 days)
  if (settings.badgeNew) {
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation <= 30) {
      badges.push({
        label: 'جديد',
        className: 'bg-green-500 text-white'
      });
    }
  }

  // Best Seller badge (if featured)
  if (settings.badgeBestSeller && product.isFeatured) {
    badges.push({
      label: 'الأكثر مبيعاً',
      className: 'bg-purple-500 text-white'
    });
  }

  // On Sale badge
  if (settings.badgeOnSale && product.comparePrice && product.comparePrice > product.price) {
    badges.push({
      label: 'عرض خاص',
      className: 'bg-red-500 text-white'
    });
  }

  // Out of Stock badge
  if (settings.badgeOutOfStock && product.stock === 0) {
    badges.push({
      label: 'نفد المخزون',
      className: 'bg-gray-500 text-white'
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
      {badges.map((badge, index) => (
        <span
          key={index}
          className={`px-2 py-1 rounded text-xs font-bold ${badge.className}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
};

export default ProductBadges;

