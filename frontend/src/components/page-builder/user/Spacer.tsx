import React from 'react';
import { useNode } from '@craftjs/core';
import { SpacerSettings } from './SpacerSettings';

export interface SpacerProps {
  height?: number;
}

export const Spacer: React.FC<SpacerProps> = ({
  height = 50
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
        height: `${height}px`,
        border: selected ? '2px dashed #4F46E5' : '2px dashed transparent',
        cursor: 'move',
        transition: 'all 0.2s',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: selected ? 'rgba(79, 70, 229, 0.05)' : 'transparent'
      }}
    >
      {selected && (
        <>
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
            📏 مسافة
          </div>
          <div
            style={{
              color: '#4F46E5',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            {height}px
          </div>
        </>
      )}
    </div>
  );
};

Spacer.craft = {
  displayName: 'مسافة',
  props: {
    height: 50
  },
  related: {
    settings: SpacerSettings
  }
};
