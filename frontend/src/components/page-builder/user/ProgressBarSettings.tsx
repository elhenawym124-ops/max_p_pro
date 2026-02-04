import React from 'react';
import { useNode } from '@craftjs/core';
import { ProgressBarProps } from './ProgressBar';

export const ProgressBarSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node) => ({
    props: node.data.props as ProgressBarProps
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          العنوان
        </label>
        <input
          type="text"
          value={props.title}
          onChange={(e) => setProp((props: ProgressBarProps) => (props.title = e.target.value))}
          placeholder="عنوان شريط التقدم"
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
          النسبة المئوية: {props.percentage}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={props.percentage}
          onChange={(e) => setProp((props: ProgressBarProps) => (props.percentage = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          الارتفاع: {props.height}px
        </label>
        <input
          type="range"
          min="10"
          max="40"
          value={props.height}
          onChange={(e) => setProp((props: ProgressBarProps) => (props.height = parseInt(e.target.value)))}
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
          onChange={(e) => setProp((props: ProgressBarProps) => (props.backgroundColor = e.target.value))}
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
          لون التعبئة
        </label>
        <input
          type="color"
          value={props.fillColor}
          onChange={(e) => setProp((props: ProgressBarProps) => (props.fillColor = e.target.value))}
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
            checked={props.showPercentage}
            onChange={(e) => setProp((props: ProgressBarProps) => (props.showPercentage = e.target.checked))}
            style={{ marginLeft: '8px' }}
          />
          عرض النسبة المئوية
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={props.striped}
            onChange={(e) => setProp((props: ProgressBarProps) => (props.striped = e.target.checked))}
            style={{ marginLeft: '8px' }}
          />
          خطوط مائلة
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={props.animated}
            onChange={(e) => setProp((props: ProgressBarProps) => (props.animated = e.target.checked))}
            style={{ marginLeft: '8px' }}
          />
          متحرك
        </label>
      </div>

      <div style={{
        padding: '12px',
        background: '#1f2937',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#9ca3af',
        lineHeight: 1.5
      }}>
        💡 استخدم شريط التقدم لعرض المهارات أو نسب الإنجاز
      </div>
    </div>
  );
};
