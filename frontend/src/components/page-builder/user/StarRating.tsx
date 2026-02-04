import React from 'react';
import { useNode } from '@craftjs/core';
import { StarRatingSettings } from './StarRatingSettings';

export interface StarRatingProps {
  rating?: number;
  maxRating?: number;
  size?: number;
  color?: string;
  emptyColor?: string;
  showLabel?: boolean;
  label?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating = 4.5,
  maxRating = 5,
  size = 24,
  color = '#fbbf24',
  emptyColor = '#d1d5db',
  showLabel = true,
  label = ''
}) => {
  const {
    connectors: { connect, drag },
    selected
  } = useNode((state) => ({
    selected: state.events.selected
  }));

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= maxRating; i++) {
      const fillPercentage = Math.min(Math.max(rating - (i - 1), 0), 1) * 100;
      
      stars.push(
        <div
          key={i}
          style={{
            position: 'relative',
            display: 'inline-block',
            width: `${size}px`,
            height: `${size}px`
          }}
        >
          {/* Empty star */}
          <svg
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              fill: emptyColor
            }}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          
          {/* Filled star */}
          <svg
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              fill: color,
              clipPath: `inset(0 ${100 - fillPercentage}% 0 0)`
            }}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      );
    }
    return stars;
  };

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        padding: '10px',
        border: selected ? '2px solid #4F46E5' : '2px solid transparent',
        cursor: 'move',
        transition: 'all 0.2s',
        position: 'relative'
      }}
    >
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: '-25px',
            left: '0',
            background: '#4F46E5',
            color: 'white',
            padding: '2px 8px',
            fontSize: '11px',
            borderRadius: '3px',
            fontWeight: 500
          }}
        >
          ⭐ تقييم
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', gap: '2px' }}>
          {renderStars()}
        </div>
        
        {showLabel && (
          <span
            style={{
              fontSize: '14px',
              color: '#6b7280',
              fontWeight: 500
            }}
          >
            {label || `${rating.toFixed(1)} / ${maxRating}`}
          </span>
        )}
      </div>
    </div>
  );
};

StarRating.craft = {
  displayName: 'تقييم نجوم',
  props: {
    rating: 4.5,
    maxRating: 5,
    size: 24,
    color: '#fbbf24',
    emptyColor: '#d1d5db',
    showLabel: true,
    label: ''
  },
  related: {
    settings: StarRatingSettings
  }
};
