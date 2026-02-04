import React from 'react';
import { useNode } from '@craftjs/core';
import { SpacerProps } from './Spacer';

export const SpacerSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node) => ({
    props: node.data.props as SpacerProps
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          الارتفاع: {props.height}px
        </label>
        <input
          type="range"
          min="10"
          max="200"
          value={props.height}
          onChange={(e) => setProp((props: SpacerProps) => (props.height = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: '#9ca3af' }}>
          أحجام سريعة
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[20, 50, 100].map((size) => (
            <button
              key={size}
              onClick={() => setProp((props: SpacerProps) => (props.height = size))}
              style={{
                padding: '8px',
                background: props.height === size ? '#4F46E5' : '#2a2a2a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              {size}px
            </button>
          ))}
        </div>
      </div>

      <div style={{
        padding: '12px',
        background: '#1f2937',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#9ca3af',
        lineHeight: 1.5
      }}>
        💡 المسافة تستخدم لإضافة مساحة عمودية بين العناصر
      </div>
    </div>
  );
};
