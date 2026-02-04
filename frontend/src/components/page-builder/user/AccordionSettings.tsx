import React from 'react';
import { useNode } from '@craftjs/core';
import { AccordionProps, AccordionItem } from './Accordion';

export const AccordionSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node) => ({
    props: node.data.props as AccordionProps
  }));

  const addItem = () => {
    const newId = (props.items?.length || 0) + 1;
    setProp((props: AccordionProps) => {
      props.items = [
        ...(props.items || []),
        { id: String(newId), title: `السؤال ${newId}`, content: `الإجابة ${newId}`, isOpen: false }
      ];
    });
  };

  const removeItem = (id: string) => {
    setProp((props: AccordionProps) => {
      props.items = props.items?.filter((item) => item.id !== id);
    });
  };

  const updateItem = (id: string, field: keyof AccordionItem, value: string | boolean) => {
    setProp((props: AccordionProps) => {
      const item = props.items?.find((i) => i.id === id);
      if (item) {
        (item as any)[field] = value;
      }
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500 }}>العناصر</label>
          <button
            onClick={addItem}
            style={{
              padding: '6px 12px',
              background: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            + إضافة عنصر
          </button>
        </div>

        {props.items?.map((item, index) => (
          <div
            key={item.id}
            style={{
              marginBottom: '12px',
              padding: '12px',
              background: '#2a2a2a',
              borderRadius: '6px',
              border: '1px solid #333'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>العنصر {index + 1}</span>
              {props.items && props.items.length > 1 && (
                <button
                  onClick={() => removeItem(item.id)}
                  style={{
                    padding: '2px 8px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  حذف
                </button>
              )}
            </div>

            <input
              type="text"
              value={item.title}
              onChange={(e) => updateItem(item.id, 'title', e.target.value)}
              placeholder="العنوان"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '8px',
                border: '1px solid #444',
                borderRadius: '4px',
                background: '#1a1a1a',
                color: 'white',
                fontSize: '13px'
              }}
            />

            <textarea
              value={item.content}
              onChange={(e) => updateItem(item.id, 'content', e.target.value)}
              placeholder="المحتوى"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '8px',
                border: '1px solid #444',
                borderRadius: '4px',
                background: '#1a1a1a',
                color: 'white',
                fontSize: '13px',
                minHeight: '60px',
                resize: 'vertical'
              }}
            />

            <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#9ca3af' }}>
              <input
                type="checkbox"
                checked={item.isOpen}
                onChange={(e) => updateItem(item.id, 'isOpen', e.target.checked)}
                style={{ marginLeft: '8px' }}
              />
              مفتوح افتراضياً
            </label>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={props.allowMultiple}
            onChange={(e) => setProp((props: AccordionProps) => (props.allowMultiple = e.target.checked))}
            style={{ marginLeft: '8px' }}
          />
          السماح بفتح عدة عناصر
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          لون العنصر النشط
        </label>
        <input
          type="color"
          value={props.activeColor}
          onChange={(e) => setProp((props: AccordionProps) => (props.activeColor = e.target.value))}
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
          لون الحدود
        </label>
        <input
          type="color"
          value={props.borderColor}
          onChange={(e) => setProp((props: AccordionProps) => (props.borderColor = e.target.value))}
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
          لون الخلفية
        </label>
        <input
          type="color"
          value={props.backgroundColor}
          onChange={(e) => setProp((props: AccordionProps) => (props.backgroundColor = e.target.value))}
          style={{
            width: '100%',
            height: '40px',
            border: '1px solid #333',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        />
      </div>
    </div>
  );
};
