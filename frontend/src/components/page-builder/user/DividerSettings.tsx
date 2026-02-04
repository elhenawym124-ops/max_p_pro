import React from 'react';
import { useNode } from '@craftjs/core';
import { DividerProps } from './Divider';

export const DividerSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node) => ({
    props: node.data.props as DividerProps
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          نمط الخط
        </label>
        <select
          value={props.style}
          onChange={(e) => setProp((props: DividerProps) => (props.style = e.target.value as any))}
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
          <option value="solid">متصل</option>
          <option value="dashed">متقطع</option>
          <option value="dotted">نقاط</option>
          <option value="double">مزدوج</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          العرض: {props.width}
        </label>
        <input
          type="range"
          min="10"
          max="100"
          value={parseInt(props.width || '100')}
          onChange={(e) => setProp((props: DividerProps) => (props.width = `${e.target.value}%`))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          السُمك: {props.height}px
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={props.height}
          onChange={(e) => setProp((props: DividerProps) => (props.height = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          اللون
        </label>
        <input
          type="color"
          value={props.color}
          onChange={(e) => setProp((props: DividerProps) => (props.color = e.target.value))}
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
              onClick={() => setProp((props: DividerProps) => (props.alignment = align))}
              style={{
                flex: 1,
                padding: '8px',
                background: props.alignment === align ? '#4F46E5' : '#2a2a2a',
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
          المسافة: {props.gap}px
        </label>
        <input
          type="range"
          min="0"
          max="50"
          value={props.gap}
          onChange={(e) => setProp((props: DividerProps) => (props.gap = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};
