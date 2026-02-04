import React from 'react';
import { useEditor } from '@craftjs/core';

interface TopbarProps {
  onSave?: (json: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onSave }) => {
  const { actions, query, canUndo, canRedo, enabled } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo()
  }));

  const handleSave = () => {
    const json = query.serialize();
    console.log('Saved JSON:', json);
    if (onSave) {
      onSave(json);
    }
    // يمكنك هنا إرسال البيانات للـ Backend
    alert('تم الحفظ بنجاح! ✅');
  };

  const handleExport = () => {
    const json = query.serialize();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `page-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        height: '60px',
        background: '#4F46E5',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '20px' }}>
        <div style={{ fontSize: '24px' }}>🎨</div>
        <div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: '16px' }}>Page Builder</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>محرر الصفحات</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => actions.history.undo()}
          disabled={!canUndo}
          style={{
            padding: '8px 16px',
            background: canUndo ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            opacity: canUndo ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (canUndo) e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            if (canUndo) e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          <span>↶</span>
          <span>تراجع</span>
        </button>

        <button
          onClick={() => actions.history.redo()}
          disabled={!canRedo}
          style={{
            padding: '8px 16px',
            background: canRedo ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: canRedo ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            opacity: canRedo ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (canRedo) e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            if (canRedo) e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          <span>↷</span>
          <span>إعادة</span>
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Mode Toggle */}
      <button
        onClick={() => actions.setOptions((options) => (options.enabled = !enabled))}
        style={{
          padding: '8px 16px',
          background: enabled ? '#10B981' : '#EF4444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s'
        }}
      >
        <span>{enabled ? '✏️' : '👁️'}</span>
        <span>{enabled ? 'وضع التحرير' : 'وضع المعاينة'}</span>
      </button>

      {/* Export */}
      <button
        onClick={handleExport}
        style={{
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.2)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
        }}
      >
        <span>📥</span>
        <span>تصدير</span>
      </button>

      {/* Save */}
      <button
        onClick={handleSave}
        style={{
          padding: '10px 24px',
          background: '#10B981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#059669';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#10B981';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        }}
      >
        <span>💾</span>
        <span>حفظ</span>
      </button>
    </div>
  );
};
