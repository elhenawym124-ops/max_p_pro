import React from 'react';
import { useNode } from '@craftjs/core';
import { HeadingSettings } from './HeadingSettings';

export interface HeadingProps {
  text?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  margin?: number;
}

export const Heading: React.FC<HeadingProps> = ({
  text = 'عنوان الصفحة',
  tag = 'h2',
  fontSize = 32,
  fontWeight = 700,
  color = '#000000',
  textAlign = 'right',
  margin = 10
}) => {
  const {
    connectors: { connect, drag },
    selected,
    actions: { setProp }
  } = useNode((state) => ({
    selected: state.events.selected
  }));

  const Tag = tag;

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
          📌 عنوان ({tag.toUpperCase()})
        </div>
      )}
      <Tag
        style={{
          fontSize: `${fontSize}px`,
          fontWeight,
          color,
          textAlign,
          margin: 0,
          lineHeight: 1.3
        }}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => setProp((props: HeadingProps) => (props.text = e.currentTarget.textContent || ''))}
      >
        {text}
      </Tag>
    </div>
  );
};

Heading.craft = {
  displayName: 'عنوان',
  props: {
    text: 'عنوان الصفحة',
    tag: 'h2',
    fontSize: 32,
    fontWeight: 700,
    color: '#000000',
    textAlign: 'right',
    margin: 10
  },
  related: {
    settings: HeadingSettings
  }
};
