import React, { useState, useEffect } from 'react';
import { useNode } from '@craftjs/core';
import { CountdownTimerSettings } from './CountdownTimerSettings';

export interface CountdownTimerProps {
  endDate?: string;
  title?: string;
  backgroundColor?: string;
  textColor?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endDate = new Date(Date.now() + 86400000).toISOString(),
  title = 'العرض ينتهي خلال',
  backgroundColor = '#FEF3C7',
  textColor = '#1F2937'
}) => {
  const {
    connectors: { connect, drag },
    selected
  } = useNode((state: any) => ({
    selected: state.events.selected
  }));

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = +new Date(endDate) - +new Date();

    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    }
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

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
            fontWeight: 500,
            zIndex: 10
          }}
        >
          ⏰ عداد تنازلي
        </div>
      )}
      <div
        style={{
          background: backgroundColor,
          padding: '30px',
          textAlign: 'center',
          borderRadius: '8px'
        }}
      >
        <h3 style={{ margin: '0 0 20px', fontSize: '24px', color: textColor }}>{title}</h3>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {Object.entries(timeLeft).map(([unit, value]) => (
            <div
              key={unit}
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                minWidth: '80px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: textColor }}>{value}</div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                {unit === 'days' ? 'يوم' : unit === 'hours' ? 'ساعة' : unit === 'minutes' ? 'دقيقة' : 'ثانية'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

CountdownTimer.craft = {
  displayName: 'عداد تنازلي',
  props: {
    endDate: new Date(Date.now() + 86400000).toISOString(),
    title: 'العرض ينتهي خلال',
    backgroundColor: '#FEF3C7',
    textColor: '#1F2937'
  },
  related: {
    settings: CountdownTimerSettings
  }
};
