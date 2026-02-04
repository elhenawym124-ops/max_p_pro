import React, { useState } from 'react';
import { useNode } from '@craftjs/core';
import { AccordionSettings } from './AccordionSettings';

export interface AccordionItem {
  id: string;
  title: string;
  content: string;
  isOpen: boolean;
}

export interface AccordionProps {
  items?: AccordionItem[];
  allowMultiple?: boolean;
  borderColor?: string;
  activeColor?: string;
  backgroundColor?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  items = [
    { id: '1', title: 'السؤال الأول', content: 'الإجابة على السؤال الأول', isOpen: true },
    { id: '2', title: 'السؤال الثاني', content: 'الإجابة على السؤال الثاني', isOpen: false },
    { id: '3', title: 'السؤال الثالث', content: 'الإجابة على السؤال الثالث', isOpen: false }
  ],
  allowMultiple = false,
  borderColor = '#e5e7eb',
  activeColor = '#4F46E5',
  backgroundColor = '#ffffff'
}) => {
  const {
    connectors: { connect, drag },
    selected
  } = useNode((state) => ({
    selected: state.events.selected
  }));

  const [openItems, setOpenItems] = useState<string[]>(
    items.filter((item) => item.isOpen).map((item) => item.id)
  );

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenItems((prev) =>
        prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
      );
    } else {
      setOpenItems((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

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
          📋 أكورديون
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item) => {
          const isOpen = openItems.includes(item.id);
          return (
            <div
              key={item.id}
              style={{
                border: `1px solid ${borderColor}`,
                borderRadius: '6px',
                overflow: 'hidden',
                background: backgroundColor
              }}
            >
              {/* Header */}
              <button
                onClick={() => toggleItem(item.id)}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: isOpen ? activeColor : backgroundColor,
                  color: isOpen ? 'white' : '#1f2937',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  textAlign: 'right',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <span>{item.title}</span>
                <span
                  style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                >
                  ▼
                </span>
              </button>

              {/* Content */}
              {isOpen && (
                <div
                  style={{
                    padding: '16px',
                    borderTop: `1px solid ${borderColor}`,
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: '#4b5563'
                  }}
                >
                  {item.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

Accordion.craft = {
  displayName: 'أكورديون',
  props: {
    items: [
      { id: '1', title: 'السؤال الأول', content: 'الإجابة على السؤال الأول', isOpen: true },
      { id: '2', title: 'السؤال الثاني', content: 'الإجابة على السؤال الثاني', isOpen: false },
      { id: '3', title: 'السؤال الثالث', content: 'الإجابة على السؤال الثالث', isOpen: false }
    ],
    allowMultiple: false,
    borderColor: '#e5e7eb',
    activeColor: '#4F46E5',
    backgroundColor: '#ffffff'
  },
  related: {
    settings: AccordionSettings
  }
};
