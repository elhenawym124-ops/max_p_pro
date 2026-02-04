import React, { useEffect, useState } from 'react';
import { useNode } from '@craftjs/core';
import { CounterSettings } from './CounterSettings';

export interface CounterProps {
  startValue?: number;
  endValue?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  title?: string;
  separator?: boolean;
  decimals?: number;
  fontSize?: number;
  color?: string;
  titleColor?: string;
}

export const Counter: React.FC<CounterProps> = ({
  startValue = 0,
  endValue = 1000,
  duration = 2000,
  prefix = '',
  suffix = '',
  title = 'عملاء سعداء',
  separator = true,
  decimals = 0,
  fontSize = 48,
  color = '#4F46E5',
  titleColor = '#6b7280'
}) => {
  const {
    connectors: { connect, drag },
    selected
  } = useNode((state) => ({
    selected: state.events.selected
  }));

  const [count, setCount] = useState(startValue);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;

    const increment = (endValue - startValue) / (duration / 16);
    let current = startValue;

    const timer = setInterval(() => {
      current += increment;
      if (current >= endValue) {
        setCount(endValue);
        setHasAnimated(true);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [startValue, endValue, duration, hasAnimated]);

  const formatNumber = (num: number) => {
    const fixed = num.toFixed(decimals);
    if (separator) {
      return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return fixed;
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
          🔢 عداد
        </div>
      )}

      <div
        style={{
          textAlign: 'center',
          padding: '20px'
        }}
      >
        <div
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            color,
            marginBottom: '8px',
            fontFamily: 'monospace'
          }}
        >
          {prefix}
          {formatNumber(count)}
          {suffix}
        </div>
        {title && (
          <div
            style={{
              fontSize: '18px',
              color: titleColor,
              fontWeight: 500
            }}
          >
            {title}
          </div>
        )}
      </div>
    </div>
  );
};

Counter.craft = {
  displayName: 'عداد',
  props: {
    startValue: 0,
    endValue: 1000,
    duration: 2000,
    prefix: '',
    suffix: '+',
    title: 'عملاء سعداء',
    separator: true,
    decimals: 0,
    fontSize: 48,
    color: '#4F46E5',
    titleColor: '#6b7280'
  },
  related: {
    settings: CounterSettings
  }
};
