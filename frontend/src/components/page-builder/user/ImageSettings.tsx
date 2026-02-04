import React from 'react';
import { useNode } from '@craftjs/core';
import { ImageProps } from './Image';

export const ImageSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node: any) => ({
    props: node.data.props as ImageProps
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          رابط الصورة
        </label>
        <input
          type="text"
          value={props.src}
          onChange={(e) => setProp((props: ImageProps) => (props.src = e.target.value))}
          placeholder="https://example.com/image.jpg"
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
          النص البديل
        </label>
        <input
          type="text"
          value={props.alt}
          onChange={(e) => setProp((props: ImageProps) => (props.alt = e.target.value))}
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
          العرض: {props.width}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          value={props.width}
          onChange={(e) => setProp((props: ImageProps) => (props.width = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          الارتفاع: {props.height === 0 ? 'تلقائي' : `${props.height}px`}
        </label>
        <input
          type="range"
          min="0"
          max="800"
          step="50"
          value={props.height}
          onChange={(e) => setProp((props: ImageProps) => (props.height = parseInt(e.target.value)))}
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
          onChange={(e) => setProp((props: ImageProps) => (props.borderRadius = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          طريقة العرض
        </label>
        <select
          value={props.objectFit}
          onChange={(e) => setProp((props: ImageProps) => (props.objectFit = e.target.value as any))}
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
          <option value="cover">تغطية (Cover)</option>
          <option value="contain">احتواء (Contain)</option>
          <option value="fill">ملء (Fill)</option>
        </select>
      </div>
    </div>
  );
};
