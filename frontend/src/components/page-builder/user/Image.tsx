import React from 'react';
import { useNode } from '@craftjs/core';
import { ImageSettings } from './ImageSettings';

export interface ImageProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  objectFit?: 'cover' | 'contain' | 'fill';
}

export const Image: React.FC<ImageProps> = ({
  src = 'https://via.placeholder.com/600x400?text=اضف+صورة',
  alt = 'صورة',
  width = 100,
  height = 300,
  borderRadius = 0,
  objectFit = 'cover'
}) => {
  const {
    connectors: { connect, drag },
    selected
  } = useNode((state: any) => ({
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
        display: 'inline-block'
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
          🖼️ صورة
        </div>
      )}
      <img
        src={src}
        alt={alt}
        style={{
          width: `${width}%`,
          height: height === 0 ? 'auto' : `${height}px`,
          borderRadius: `${borderRadius}px`,
          objectFit,
          display: 'block'
        }}
      />
    </div>
  );
};

Image.craft = {
  displayName: 'صورة',
  props: {
    src: 'https://via.placeholder.com/600x400?text=اضف+صورة',
    alt: 'صورة',
    width: 100,
    height: 300,
    borderRadius: 0,
    objectFit: 'cover'
  },
  related: {
    settings: ImageSettings
  }
};
