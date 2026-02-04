import React from 'react';
import { useNode } from '@craftjs/core';
import { ButtonProps } from './Button';

export const ButtonSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node) => ({
    props: node.data.props as ButtonProps
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          نص الزر
        </label>
        <input
          type="text"
          value={props.text}
          onChange={(e) => setProp((props: ButtonProps) => (props.text = e.target.value))}
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
          الرابط
        </label>
        <input
          type="text"
          value={props.href}
          onChange={(e) => setProp((props: ButtonProps) => (props.href = e.target.value))}
          placeholder="https://example.com"
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
          لون الخلفية
        </label>
        <input
          type="color"
          value={props.backgroundColor}
          onChange={(e) => setProp((props: ButtonProps) => (props.backgroundColor = e.target.value))}
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
          لون النص
        </label>
        <input
          type="color"
          value={props.color}
          onChange={(e) => setProp((props: ButtonProps) => (props.color = e.target.value))}
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
          حجم الخط: {props.fontSize}px
        </label>
        <input
          type="range"
          min="12"
          max="24"
          value={props.fontSize}
          onChange={(e) => setProp((props: ButtonProps) => (props.fontSize = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          المسافة الداخلية: {props.padding}px
        </label>
        <input
          type="range"
          min="8"
          max="24"
          value={props.padding}
          onChange={(e) => setProp((props: ButtonProps) => (props.padding = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          استدارة الحواف: {props.borderRadius}px
        </label>
        <input
          type="range"
          min="0"
          max="50"
          value={props.borderRadius}
          onChange={(e) => setProp((props: ButtonProps) => (props.borderRadius = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={props.fullWidth}
            onChange={(e) => setProp((props: ButtonProps) => (props.fullWidth = e.target.checked))}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>عرض كامل</span>
        </label>
      </div>
    </div>
  );
};
