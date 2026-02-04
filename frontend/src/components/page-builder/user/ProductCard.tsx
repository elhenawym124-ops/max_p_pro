import React from 'react';
import { useNode } from '@craftjs/core';
import { ProductCardSettings } from './ProductCardSettings';

export interface ProductCardProps {
  imageUrl?: string;
  title?: string;
  price?: number;
  discount?: number;
  backgroundColor?: string;
  borderRadius?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  imageUrl = 'https://via.placeholder.com/300x300?text=منتج',
  title = 'اسم المنتج',
  price = 99,
  discount = 0,
  backgroundColor = '#ffffff',
  borderRadius = 8
}) => {
  const {
    connectors: { connect, drag },
    selected
  } = useNode((state: any) => ({
    selected: state.events.selected
  }));

  const finalPrice = price - (price * discount) / 100;

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        padding: '10px',
        border: selected ? '2px solid #4F46E5' : '2px solid transparent',
        cursor: 'move',
        transition: 'all 0.2s',
        position: 'relative',
        display: 'inline-block'
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
          🛍️ بطاقة منتج
        </div>
      )}
      <div
        style={{
          backgroundColor,
          borderRadius: `${borderRadius}px`,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '300px'
        }}
      >
        <div style={{ position: 'relative' }}>
          <img
            src={imageUrl}
            alt={title}
            style={{
              width: '100%',
              height: '300px',
              objectFit: 'cover'
            }}
          />
          {discount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: '#EF4444',
                color: 'white',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              -{discount}%
            </div>
          )}
        </div>
        <div style={{ padding: '20px' }}>
          <h3
            style={{
              margin: '0 0 10px',
              fontSize: '18px',
              fontWeight: 600,
              color: '#1F2937'
            }}
          >
            {title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            {discount > 0 && (
              <span
                style={{
                  fontSize: '16px',
                  color: '#9CA3AF',
                  textDecoration: 'line-through'
                }}
              >
                {price} جنيه
              </span>
            )}
            <span
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#10B981'
              }}
            >
              {finalPrice.toFixed(0)} جنيه
            </span>
          </div>
          <button
            style={{
              width: '100%',
              padding: '12px',
              background: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#4338CA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#4F46E5';
            }}
          >
            أضف للسلة
          </button>
        </div>
      </div>
    </div>
  );
};

ProductCard.craft = {
  displayName: 'بطاقة منتج',
  props: {
    imageUrl: 'https://via.placeholder.com/300x300?text=منتج',
    title: 'اسم المنتج',
    price: 99,
    discount: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8
  },
  related: {
    settings: ProductCardSettings
  }
};
