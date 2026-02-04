import React, { useState } from 'react';
import { useNode } from '@craftjs/core';
import { TabsSettings } from './TabsSettings';

export interface Tab {
  id: string;
  title: string;
  content: string;
}

export interface TabsProps {
  tabs?: Tab[];
  activeColor?: string;
  inactiveColor?: string;
  borderColor?: string;
  contentBackground?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs = [
    { id: '1', title: 'التبويب 1', content: 'محتوى التبويب الأول' },
    { id: '2', title: 'التبويب 2', content: 'محتوى التبويب الثاني' },
    { id: '3', title: 'التبويب 3', content: 'محتوى التبويب الثالث' }
  ],
  activeColor = '#4F46E5',
  inactiveColor = '#6b7280',
  borderColor = '#e5e7eb',
  contentBackground = '#ffffff'
}) => {
  const {
    connectors: { connect, drag },
    selected
  } = useNode((state) => ({
    selected: state.events.selected
  }));

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '1');

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        padding: '10px',
        border: selected ? '2px solid #4F46E5' : '2px solid transparent',
        cursor: 'move',
        transition: 'all 0.2s',
        position: 'relative'
      }}
    >
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: '-25px',
            left: '0',
            background: '#4F46E5',
            color: 'white',
            padding: '2px 8px',
            fontSize: '11px',
            borderRadius: '3px',
            fontWeight: 500
          }}
        >
          📑 تبويبات
        </div>
      )}

      {/* Tab Headers */}
      <div
        style={{
          display: 'flex',
          borderBottom: `2px solid ${borderColor}`,
          gap: '4px'
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.id ? activeColor : 'transparent',
              color: activeTab === tab.id ? 'white' : inactiveColor,
              border: 'none',
              borderBottom: activeTab === tab.id ? `3px solid ${activeColor}` : 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'all 0.2s',
              borderRadius: '4px 4px 0 0'
            }}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        style={{
          padding: '20px',
          background: contentBackground,
          border: `1px solid ${borderColor}`,
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          minHeight: '100px'
        }}
      >
        {tabs.find((tab) => tab.id === activeTab)?.content || 'محتوى التبويب'}
      </div>
    </div>
  );
};

Tabs.craft = {
  displayName: 'تبويبات',
  props: {
    tabs: [
      { id: '1', title: 'التبويب 1', content: 'محتوى التبويب الأول' },
      { id: '2', title: 'التبويب 2', content: 'محتوى التبويب الثاني' },
      { id: '3', title: 'التبويب 3', content: 'محتوى التبويب الثالث' }
    ],
    activeColor: '#4F46E5',
    inactiveColor: '#6b7280',
    borderColor: '#e5e7eb',
    contentBackground: '#ffffff'
  },
  related: {
    settings: TabsSettings
  }
};
