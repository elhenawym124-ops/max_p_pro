import React, { useState } from 'react';
import { useEditor } from '@craftjs/core';

export const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const { selected, actions } = useEditor((state, query) => {
    const [currentNodeId] = state.events.selected;
    let selected: any;

    if (currentNodeId) {
      const node = state.nodes[currentNodeId];
      selected = {
        id: currentNodeId,
        name: node.data.displayName || node.data.name,
        settings: node.related?.settings
      };
    }

    return { selected };
  });

  const handleDelete = () => {
    if (selected && selected.id) {
      // Prevent deleting the root container
      if (selected.id === 'root_container') {
        alert('لا يمكن حذف الحاوية الرئيسية');
        return;
      }
      
      if (window.confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
        actions.delete(selected.id);
      }
    }
  };

  if (!selected) {
    return (
      <div
        style={{
          width: '320px',
          background: '#1e1e1e',
          color: 'white',
          padding: '40px 20px',
          textAlign: 'center',
          borderLeft: '1px solid #333'
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.3 }}>🎨</div>
        <h3 style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: 600 }}>لم يتم اختيار عنصر</h3>
        <p style={{ color: '#888', fontSize: '13px', lineHeight: 1.6 }}>
          انقر على أي عنصر في الصفحة لتعديل إعداداته
        </p>
      </div>
    );
  }

  const SettingsComponent = selected.settings;

  const tabs = [
    { id: 0, label: 'المحتوى', icon: '📝' },
    { id: 1, label: 'التصميم', icon: '🎨' },
    { id: 2, label: 'متقدم', icon: '⚙️' }
  ];

  return (
    <div
      style={{
        width: '320px',
        background: '#1e1e1e',
        color: 'white',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid #333'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid #333'
        }}
      >
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '5px' }}>تحرير</div>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{selected.name}</h3>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #333',
          background: '#2a2a2a'
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '12px 8px',
              background: activeTab === tab.id ? '#4F46E5' : 'transparent',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '16px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto'
        }}
      >
        {activeTab === 0 && (
          <div>
            {SettingsComponent ? (
              <SettingsComponent />
            ) : (
              <div style={{ padding: '20px', color: '#888', fontSize: '13px' }}>
                لا توجد إعدادات متاحة لهذا العنصر
              </div>
            )}
          </div>
        )}

        {activeTab === 1 && (
          <div style={{ padding: '20px' }}>
            <div style={{ color: '#888', fontSize: '13px' }}>
              <p>إعدادات التصميم قيد التطوير...</p>
              <p style={{ marginTop: '10px', fontSize: '11px' }}>
                سيتم إضافة خيارات متقدمة للتصميم قريباً
              </p>
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div style={{ padding: '20px' }}>
            <div style={{ color: '#888', fontSize: '13px' }}>
              <p>الإعدادات المتقدمة قيد التطوير...</p>
              <p style={{ marginTop: '10px', fontSize: '11px' }}>
                سيتم إضافة خيارات CSS مخصصة وأنيميشن قريباً
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '15px',
          borderTop: '1px solid #333',
          fontSize: '11px',
          color: '#888'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>ID: {selected.id.slice(0, 8)}...</span>
          <button
            onClick={handleDelete}
            style={{
              background: '#EF4444',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#DC2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#EF4444';
            }}
          >
            🗑️ حذف
          </button>
        </div>
      </div>
    </div>
  );
};
