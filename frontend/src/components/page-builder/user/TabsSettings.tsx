import React from 'react';
import { useNode } from '@craftjs/core';
import { TabsProps, Tab } from './Tabs';

export const TabsSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node) => ({
    props: node.data.props as TabsProps
  }));

  const addTab = () => {
    const newId = (props.tabs?.length || 0) + 1;
    setProp((props: TabsProps) => {
      props.tabs = [
        ...(props.tabs || []),
        { id: String(newId), title: `التبويب ${newId}`, content: `محتوى التبويب ${newId}` }
      ];
    });
  };

  const removeTab = (id: string) => {
    setProp((props: TabsProps) => {
      props.tabs = props.tabs?.filter((tab) => tab.id !== id);
    });
  };

  const updateTab = (id: string, field: keyof Tab, value: string) => {
    setProp((props: TabsProps) => {
      const tab = props.tabs?.find((t) => t.id === id);
      if (tab) {
        tab[field] = value;
      }
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500 }}>التبويبات</label>
          <button
            onClick={addTab}
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
            + إضافة تبويب
          </button>
        </div>

        {props.tabs?.map((tab, index) => (
          <div
            key={tab.id}
            style={{
              marginBottom: '12px',
              padding: '12px',
              background: '#2a2a2a',
              borderRadius: '6px',
              border: '1px solid #333'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>التبويب {index + 1}</span>
              {props.tabs && props.tabs.length > 1 && (
                <button
                  onClick={() => removeTab(tab.id)}
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
              value={tab.title}
              onChange={(e) => updateTab(tab.id, 'title', e.target.value)}
              placeholder="عنوان التبويب"
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
              value={tab.content}
              onChange={(e) => updateTab(tab.id, 'content', e.target.value)}
              placeholder="محتوى التبويب"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #444',
                borderRadius: '4px',
                background: '#1a1a1a',
                color: 'white',
                fontSize: '13px',
                minHeight: '60px',
                resize: 'vertical'
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          لون التبويب النشط
        </label>
        <input
          type="color"
          value={props.activeColor}
          onChange={(e) => setProp((props: TabsProps) => (props.activeColor = e.target.value))}
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
          لون التبويب غير النشط
        </label>
        <input
          type="color"
          value={props.inactiveColor}
          onChange={(e) => setProp((props: TabsProps) => (props.inactiveColor = e.target.value))}
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
          onChange={(e) => setProp((props: TabsProps) => (props.borderColor = e.target.value))}
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
          خلفية المحتوى
        </label>
        <input
          type="color"
          value={props.contentBackground}
          onChange={(e) => setProp((props: TabsProps) => (props.contentBackground = e.target.value))}
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
