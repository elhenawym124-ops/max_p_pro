import React from 'react';
import { useNode } from '@craftjs/core';
import { CounterProps } from './Counter';

export const CounterSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node) => ({
    props: node.data.props as CounterProps
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          القيمة النهائية: {props.endValue}
        </label>
        <input
          type="number"
          value={props.endValue}
          onChange={(e) => setProp((props: CounterProps) => (props.endValue = parseInt(e.target.value) || 0))}
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
          القيمة البدائية: {props.startValue}
        </label>
        <input
          type="number"
          value={props.startValue}
          onChange={(e) => setProp((props: CounterProps) => (props.startValue = parseInt(e.target.value) || 0))}
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
          المدة (ميلي ثانية): {props.duration}
        </label>
        <input
          type="range"
          min="500"
          max="5000"
          step="100"
          value={props.duration}
          onChange={(e) => setProp((props: CounterProps) => (props.duration = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          البادئة (قبل الرقم)
        </label>
        <input
          type="text"
          value={props.prefix}
          onChange={(e) => setProp((props: CounterProps) => (props.prefix = e.target.value))}
          placeholder="مثال: $"
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
          اللاحقة (بعد الرقم)
        </label>
        <input
          type="text"
          value={props.suffix}
          onChange={(e) => setProp((props: CounterProps) => (props.suffix = e.target.value))}
          placeholder="مثال: +"
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
          العنوان
        </label>
        <input
          type="text"
          value={props.title}
          onChange={(e) => setProp((props: CounterProps) => (props.title = e.target.value))}
          placeholder="عنوان العداد"
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
          حجم الخط: {props.fontSize}px
        </label>
        <input
          type="range"
          min="24"
          max="96"
          value={props.fontSize}
          onChange={(e) => setProp((props: CounterProps) => (props.fontSize = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          لون الرقم
        </label>
        <input
          type="color"
          value={props.color}
          onChange={(e) => setProp((props: CounterProps) => (props.color = e.target.value))}
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
          لون العنوان
        </label>
        <input
          type="color"
          value={props.titleColor}
          onChange={(e) => setProp((props: CounterProps) => (props.titleColor = e.target.value))}
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
            checked={props.separator}
            onChange={(e) => setProp((props: CounterProps) => (props.separator = e.target.checked))}
            style={{ marginLeft: '8px' }}
          />
          فاصل الآلاف (1,000)
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          عدد الخانات العشرية: {props.decimals}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          value={props.decimals}
          onChange={(e) => setProp((props: CounterProps) => (props.decimals = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        padding: '12px',
        background: '#1f2937',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#9ca3af',
        lineHeight: 1.5
      }}>
        💡 استخدم العداد لعرض الإحصائيات مثل عدد العملاء أو المنتجات أو المبيعات
      </div>
    </div>
  );
};
