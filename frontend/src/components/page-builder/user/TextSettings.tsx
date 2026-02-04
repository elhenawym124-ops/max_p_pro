import React from 'react';
import { useNode } from '@craftjs/core';
import { TextProps } from './Text';

export const TextSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node) => ({
    props: node.data.props as TextProps
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          النص
        </label>
        <textarea
          value={props.text}
          onChange={(e) => setProp((props: TextProps) => (props.text = e.target.value))}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #333',
            borderRadius: '4px',
            background: '#2a2a2a',
            color: 'white',
            fontSize: '13px',
            minHeight: '80px',
            resize: 'vertical'
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
          max="72"
          value={props.fontSize}
          onChange={(e) => setProp((props: TextProps) => (props.fontSize = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          سُمك الخط: {props.fontWeight}
        </label>
        <select
          value={props.fontWeight}
          onChange={(e) => setProp((props: TextProps) => (props.fontWeight = parseInt(e.target.value)))}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #333',
            borderRadius: '4px',
            background: '#2a2a2a',
            color: 'white',
            fontSize: '13px'
          }}
        >
          <option value="300">خفيف (300)</option>
          <option value="400">عادي (400)</option>
          <option value="500">متوسط (500)</option>
          <option value="600">سميك (600)</option>
          <option value="700">عريض (700)</option>
          <option value="800">عريض جداً (800)</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          اللون
        </label>
        <input
          type="color"
          value={props.color}
          onChange={(e) => setProp((props: TextProps) => (props.color = e.target.value))}
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
          المحاذاة
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['right', 'center', 'left'] as const).map((align) => (
            <button
              key={align}
              onClick={() => setProp((props: TextProps) => (props.textAlign = align))}
              style={{
                flex: 1,
                padding: '8px',
                background: props.textAlign === align ? '#4F46E5' : '#2a2a2a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              {align === 'right' ? 'يمين' : align === 'center' ? 'وسط' : 'يسار'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          المسافة الخارجية: {props.margin}px
        </label>
        <input
          type="range"
          min="0"
          max="50"
          value={props.margin}
          onChange={(e) => setProp((props: TextProps) => (props.margin = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};
