import React from 'react';
import { useNode } from '@craftjs/core';
import { ContainerSettings } from './ContainerSettings';

export interface ContainerProps {
  background?: string;
  padding?: number;
  margin?: number;
  borderRadius?: number;
  children?: React.ReactNode;
}

export const Container: React.FC<ContainerProps> = ({
  background = '#ffffff',
  padding = 20,
  margin = 0,
  borderRadius = 0,
  children
}) => {
  const {
    connectors: { connect, drag },
    selected,
    id
  } = useNode((state: any) => ({
    selected: state.events.selected,
    id: state.id
  }));

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        background,
        padding: `${padding}px`,
        margin: `${margin}px 0`,
        borderRadius: `${borderRadius}px`,
        minHeight: '100px',
        border: selected ? '2px solid #4F46E5' : '2px solid transparent',
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
            fontWeight: 500,
            zIndex: 10
          }}
        >
          📦 حاوية
        </div>
      )}
      {children}
    </div>
  );
};

Container.craft = {
  displayName: 'حاوية',
  props: {
    background: '#ffffff',
    padding: 20,
    margin: 0,
    borderRadius: 0
  },
  related: {
    settings: ContainerSettings
  }
};
