import React from 'react';
import { useNode } from '@craftjs/core';
import { ContainerProps } from './Container';

export const ContainerSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node: any) => ({
    props: node.data.props as ContainerProps
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          لون الخلفية
        </label>
        <input
          type="color"
          value={props.background}
          onChange={(e) => setProp((props: ContainerProps) => (props.background = e.target.value))}
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
          المسافة الداخلية: {props.padding}px
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={props.padding}
          onChange={(e) => setProp((props: ContainerProps) => (props.padding = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          المسافة الخارجية: {props.margin}px
        </label>
        <input
          type="range"
          min="0"
          max="50"
          value={props.margin}
          onChange={(e) => setProp((props: ContainerProps) => (props.margin = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          استدارة الحواف: {props.borderRadius}px
        </label>
        <input
          type="range"
          min="0"
          max="50"
          value={props.borderRadius}
          onChange={(e) => setProp((props: ContainerProps) => (props.borderRadius = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};
