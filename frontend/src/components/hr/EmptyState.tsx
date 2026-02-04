/**
 * 📭 Empty State Component
 * مكون Empty State محسّن لصفحات الموارد البشرية
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryIcon?: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryIcon: SecondaryIcon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center px-4">
      <div className="w-32 h-32 mb-6 text-gray-300">
        <Icon className="w-full h-full" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-500 mb-6 max-w-md">
        {description}
      </p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex gap-3">
          {actionLabel && onAction && (
            <Button onClick={onAction} size="lg">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" size="lg" onClick={onSecondaryAction}>
              {SecondaryIcon && <SecondaryIcon className="h-5 w-5 ml-2" />}
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
