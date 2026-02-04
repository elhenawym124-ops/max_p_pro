import React from 'react';
import {
  LockClosedIcon,
  TruckIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  CheckBadgeIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

interface SecurityBadgesProps {
  enabled: boolean;
  badges: {
    securePayment: boolean;
    freeShipping: boolean;
    qualityGuarantee: boolean;
    cashOnDelivery: boolean;
    buyerProtection: boolean;
    highRating: boolean;
    custom1?: boolean;
    custom1Text?: string;
    custom2?: boolean;
    custom2Text?: string;
  };
  layout?: 'horizontal' | 'vertical';
}

const SecurityBadges: React.FC<SecurityBadgesProps> = ({
  enabled,
  badges,
  layout = 'horizontal'
}) => {
  if (!enabled) return null;

  const activeBadges = [];

  if (badges.securePayment) {
    activeBadges.push({
      icon: LockClosedIcon,
      text: 'دفع آمن',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    });
  }

  if (badges.freeShipping) {
    activeBadges.push({
      icon: TruckIcon,
      text: 'شحن مجاني',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    });
  }

  if (badges.qualityGuarantee) {
    activeBadges.push({
      icon: CheckBadgeIcon,
      text: 'ضمان الجودة',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    });
  }

  if (badges.cashOnDelivery) {
    activeBadges.push({
      icon: CreditCardIcon,
      text: 'دفع عند الاستلام',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    });
  }

  if (badges.buyerProtection) {
    activeBadges.push({
      icon: ShieldCheckIcon,
      text: 'حماية المشتري',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    });
  }

  if (badges.highRating) {
    activeBadges.push({
      icon: StarIcon,
      text: 'تقييمات عالية',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    });
  }

  if (badges.custom1 && badges.custom1Text) {
    activeBadges.push({
      icon: CheckBadgeIcon,
      text: badges.custom1Text,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    });
  }

  if (badges.custom2 && badges.custom2Text) {
    activeBadges.push({
      icon: CheckBadgeIcon,
      text: badges.custom2Text,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    });
  }

  if (activeBadges.length === 0) return null;

  return (
    <div className={`my-4 flex gap-2 ${layout === 'vertical' ? 'flex-col' : 'flex-wrap'}`}>
      {activeBadges.map((badge, index) => {
        const Icon = badge.icon;
        return (
          <div
            key={index}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${badge.bgColor} ${badge.borderColor} ${badge.color}`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium">{badge.text}</span>
          </div>
        );
      })}
    </div>
  );
};

export default SecurityBadges;


