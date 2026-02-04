import React from 'react';
import { useNode } from '@craftjs/core';
import { DividerSettings } from './DividerSettings';

export interface DividerProps {
  style?: 'solid' | 'dashed' | 'dotted' | 'double';
  width?: string;
  height?: number;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
  gap?: number;
}

export const Divider: React.FC<DividerProps> = ({
  style = 'solid',
  width = '100%',
  height = 1,
  color = '#e5e7eb',
  alignment = 'center',
  gap = 20
}) => {
  const {
    connectors: { connect, drag },
    selected
  } = useNode((state) => ({
    selected: state.events.selected
  }));

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        padding: `${gap}px 0`,
        border: selected ? '2px solid #4F46E5' : '2px solid transparent',
        cursor: 'move',
        transition: 'all 0.2s',
        position: 'relative',
        display: 'flex',
        justifyContent: alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center'
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
          ➖ فاصل
        </div>
      )}
      <hr
        style={{
          width,
          height: `${height}px`,
          border: 'none',
          borderTop: `${height}px ${style} ${color}`,
          margin: 0
        }}
      />
    </div>
  );
};

Divider.craft = {
  displayName: 'فاصل',
  props: {
    style: 'solid',
    width: '100%',
    height: 1,
    color: '#e5e7eb',
    alignment: 'center',
    gap: 20
  },
  related: {
    settings: DividerSettings
  }
};
