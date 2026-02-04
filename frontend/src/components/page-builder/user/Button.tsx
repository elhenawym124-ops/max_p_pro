import React from 'react';
import { useNode } from '@craftjs/core';
import { ButtonSettings } from './ButtonSettings';

export interface ButtonProps {
  text?: string;
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  padding?: number;
  borderRadius?: number;
  href?: string;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  text = 'اضغط هنا',
  backgroundColor = '#4F46E5',
  color = '#ffffff',
  fontSize = 16,
  padding = 12,
  borderRadius = 8,
  href = '#',
  fullWidth = false
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
        padding: '10px',
        border: selected ? '2px solid #4F46E5' : '2px solid transparent',
        cursor: 'move',
        transition: 'all 0.2s',
        position: 'relative',
        display: 'inline-block',
        width: fullWidth ? '100%' : 'auto'
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
          🔘 زر
        </div>
      )}
      <a
        href={href}
        style={{
          display: 'inline-block',
          width: fullWidth ? '100%' : 'auto',
          backgroundColor,
          color,
          fontSize: `${fontSize}px`,
          padding: `${padding}px ${padding * 2}px`,
          borderRadius: `${borderRadius}px`,
          textDecoration: 'none',
          textAlign: 'center',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          border: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {text}
      </a>
    </div>
  );
};

Button.craft = {
  displayName: 'زر',
  props: {
    text: 'اضغط هنا',
    backgroundColor: '#4F46E5',
    color: '#ffffff',
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    href: '#',
    fullWidth: false
  },
  related: {
    settings: ButtonSettings
  }
};
