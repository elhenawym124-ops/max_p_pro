import React from 'react';
import { useNode } from '@craftjs/core';
import { ProductCardProps } from './ProductCard';

export const ProductCardSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node: any) => ({
    props: node.data.props as ProductCardProps
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          رابط الصورة
        </label>
        <input
          type="text"
          value={props.imageUrl}
          onChange={(e) => setProp((props: ProductCardProps) => (props.imageUrl = e.target.value))}
          placeholder="https://example.com/product.jpg"
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

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          اسم المنتج
        </label>
        <input
          type="text"
          value={props.title}
          onChange={(e) => setProp((props: ProductCardProps) => (props.title = e.target.value))}
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

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          السعر: {props.price} جنيه
        </label>
        <input
          type="number"
          value={props.price}
          onChange={(e) => setProp((props: ProductCardProps) => (props.price = parseFloat(e.target.value)))}
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

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          الخصم: {props.discount}%
        </label>
        <input
          type="range"
          min="0"
          max="90"
          step="5"
          value={props.discount}
          onChange={(e) => setProp((props: ProductCardProps) => (props.discount = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          لون الخلفية
        </label>
        <input
          type="color"
          value={props.backgroundColor}
          onChange={(e) => setProp((props: ProductCardProps) => (props.backgroundColor = e.target.value))}
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
          استدارة الحواف: {props.borderRadius}px
        </label>
        <input
          type="range"
          min="0"
          max="30"
          value={props.borderRadius}
          onChange={(e) => setProp((props: ProductCardProps) => (props.borderRadius = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};
