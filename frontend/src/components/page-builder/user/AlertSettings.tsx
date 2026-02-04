import React from 'react';
import { useNode } from '@craftjs/core';
import { AlertProps } from './Alert';

export const AlertSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node) => ({
    props: node.data.props as AlertProps
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          نوع التنبيه
        </label>
        <select
          value={props.type}
          onChange={(e) => setProp((props: AlertProps) => (props.type = e.target.value as any))}
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
          <option value="success">✓ نجاح (أخضر)</option>
          <option value="warning">⚠ تحذير (أصفر)</option>
          <option value="error">✕ خطأ (أحمر)</option>
          <option value="info">ℹ معلومات (أزرق)</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          العنوان (اختياري)
        </label>
        <input
          type="text"
          value={props.title}
          onChange={(e) => setProp((props: AlertProps) => (props.title = e.target.value))}
          placeholder="عنوان التنبيه"
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
          الرسالة
        </label>
        <textarea
          value={props.message}
          onChange={(e) => setProp((props: AlertProps) => (props.message = e.target.value))}
          placeholder="نص الرسالة"
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
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={props.showIcon}
            onChange={(e) => setProp((props: AlertProps) => (props.showIcon = e.target.checked))}
            style={{ marginLeft: '8px' }}
          />
          عرض الأيقونة
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={props.dismissible}
            onChange={(e) => setProp((props: AlertProps) => (props.dismissible = e.target.checked))}
            style={{ marginLeft: '8px' }}
          />
          قابل للإغلاق
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
        💡 استخدم التنبيهات لعرض رسائل مهمة للعملاء مثل العروض أو التحذيرات
      </div>
    </div>
  );
};
