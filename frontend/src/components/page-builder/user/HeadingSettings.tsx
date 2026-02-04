import React from 'react';
import { useNode } from '@craftjs/core';
import { HeadingProps } from './Heading';

export const HeadingSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node) => ({
    props: node.data.props as HeadingProps
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          النص
        </label>
        <input
          type="text"
          value={props.text}
          onChange={(e) => setProp((props: HeadingProps) => (props.text = e.target.value))}
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
          نوع العنوان
        </label>
        <select
          value={props.tag}
          onChange={(e) => setProp((props: HeadingProps) => (props.tag = e.target.value as any))}
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
          <option value="h1">H1 - عنوان رئيسي</option>
          <option value="h2">H2 - عنوان فرعي</option>
          <option value="h3">H3 - عنوان صغير</option>
          <option value="h4">H4 - عنوان أصغر</option>
          <option value="h5">H5 - عنوان صغير جداً</option>
          <option value="h6">H6 - أصغر عنوان</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          حجم الخط: {props.fontSize}px
        </label>
        <input
          type="range"
          min="16"
          max="72"
          value={props.fontSize}
          onChange={(e) => setProp((props: HeadingProps) => (props.fontSize = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          سُمك الخط: {props.fontWeight}
        </label>
        <select
          value={props.fontWeight}
          onChange={(e) => setProp((props: HeadingProps) => (props.fontWeight = parseInt(e.target.value)))}
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
          <option value="900">أعرض (900)</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          اللون
        </label>
        <input
          type="color"
          value={props.color}
          onChange={(e) => setProp((props: HeadingProps) => (props.color = e.target.value))}
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
              onClick={() => setProp((props: HeadingProps) => (props.textAlign = align))}
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
          onChange={(e) => setProp((props: HeadingProps) => (props.margin = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};
