import React from 'react';
import { useNode } from '@craftjs/core';
import { StarRatingProps } from './StarRating';

export const StarRatingSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node) => ({
    props: node.data.props as StarRatingProps
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          التقييم: {props.rating}
        </label>
        <input
          type="range"
          min="0"
          max={props.maxRating}
          step="0.1"
          value={props.rating}
          onChange={(e) => setProp((props: StarRatingProps) => (props.rating = parseFloat(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          الحد الأقصى: {props.maxRating}
        </label>
        <input
          type="range"
          min="3"
          max="10"
          value={props.maxRating}
          onChange={(e) => setProp((props: StarRatingProps) => (props.maxRating = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          حجم النجوم: {props.size}px
        </label>
        <input
          type="range"
          min="16"
          max="48"
          value={props.size}
          onChange={(e) => setProp((props: StarRatingProps) => (props.size = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          لون النجوم المملوءة
        </label>
        <input
          type="color"
          value={props.color}
          onChange={(e) => setProp((props: StarRatingProps) => (props.color = e.target.value))}
          style={{
            width: '100%',
            height: '40px',
            border: '1px solid #333',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          لون النجوم الفارغة
        </label>
        <input
          type="color"
          value={props.emptyColor}
          onChange={(e) => setProp((props: StarRatingProps) => (props.emptyColor = e.target.value))}
          style={{
            width: '100%',
            height: '40px',
            border: '1px solid #333',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={props.showLabel}
            onChange={(e) => setProp((props: StarRatingProps) => (props.showLabel = e.target.checked))}
            style={{ marginLeft: '8px' }}
          />
          عرض النص
        </label>
      </div>

      {props.showLabel && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
            النص المخصص (اختياري)
          </label>
          <input
            type="text"
            value={props.label}
            onChange={(e) => setProp((props: StarRatingProps) => (props.label = e.target.value))}
            placeholder={`${props.rating?.toFixed(1)} / ${props.maxRating}`}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #333',
              borderRadius: '4px',
              background: '#2a2a2a',
              color: 'white',
              fontSize: '13px'
            }}
          />
        </div>
      )}

      <div style={{
        padding: '12px',
        background: '#1f2937',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#9ca3af',
        lineHeight: 1.5
      }}>
        💡 استخدم التقييم لعرض تقييمات المنتجات أو آراء العملاء
      </div>
    </div>
  );
};
