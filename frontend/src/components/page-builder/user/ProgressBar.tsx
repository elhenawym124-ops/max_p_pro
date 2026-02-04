import React from 'react';
import { useNode } from '@craftjs/core';
import { ProgressBarSettings } from './ProgressBarSettings';

export interface ProgressBarProps {
  title?: string;
  percentage?: number;
  showPercentage?: boolean;
  height?: number;
  backgroundColor?: string;
  fillColor?: string;
  animated?: boolean;
  striped?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  title = 'التقدم',
  percentage = 75,
  showPercentage = true,
  height = 20,
  backgroundColor = '#e5e7eb',
  fillColor = '#4F46E5',
  animated = false,
  striped = false
}) => {
  const {
    connectors: { connect, drag },
    selected
  } = useNode((state) => ({
    selected: state.events.selected
  }));

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
          📊 شريط تقدم
        </div>
      )}

      <div style={{ width: '100%' }}>
        {/* Title and Percentage */}
        {(title || showPercentage) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151'
            }}
          >
            {title && <span>{title}</span>}
            {showPercentage && <span>{percentage}%</span>}
          </div>
        )}

        {/* Progress Bar Container */}
        <div
          style={{
            width: '100%',
            height: `${height}px`,
            backgroundColor,
            borderRadius: '9999px',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Progress Bar Fill */}
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: fillColor,
              transition: 'width 0.3s ease',
              backgroundImage: striped
                ? 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)'
                : 'none',
              backgroundSize: striped ? '1rem 1rem' : 'auto',
              animation: animated ? 'progress-bar-stripes 1s linear infinite' : 'none'
            }}
          />
        </div>
      </div>

      {/* Add animation keyframes */}
      <style>
        {`
          @keyframes progress-bar-stripes {
            0% {
              background-position: 1rem 0;
            }
            100% {
              background-position: 0 0;
            }
          }
        `}
      </style>
    </div>
  );
};

ProgressBar.craft = {
  displayName: 'شريط تقدم',
  props: {
    title: 'التقدم',
    percentage: 75,
    showPercentage: true,
    height: 20,
    backgroundColor: '#e5e7eb',
    fillColor: '#4F46E5',
    animated: false,
    striped: false
  },
  related: {
    settings: ProgressBarSettings
  }
};
