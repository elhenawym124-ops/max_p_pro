import React from 'react';
import { useNode } from '@craftjs/core';
import { TextSettings } from './TextSettings';

export interface TextProps {
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  margin?: number;
}

export const Text: React.FC<TextProps> = ({
  text = 'اكتب النص هنا...',
  fontSize = 16,
  fontWeight = 400,
  color = '#000000',
  textAlign = 'right',
  margin = 0
}) => {
  const {
    connectors: { connect, drag },
    selected,
    actions: { setProp }
  } = useNode((state) => ({
    selected: state.events.selected
  }));

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        padding: '10px',
        margin: `${margin}px 0`,
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
          📝 نص
        </div>
      )}
      <p
        style={{
          fontSize: `${fontSize}px`,
          fontWeight,
          color,
          textAlign,
          margin: 0,
          lineHeight: 1.6
        }}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => setProp((props: TextProps) => (props.text = e.currentTarget.textContent || ''))}
      >
        {text}
      </p>
    </div>
  );
};

Text.craft = {
  displayName: 'نص',
  props: {
    text: 'اكتب النص هنا...',
    fontSize: 16,
    fontWeight: 400,
    color: '#000000',
    textAlign: 'right',
    margin: 0
  },
  related: {
    settings: TextSettings
  }
};
