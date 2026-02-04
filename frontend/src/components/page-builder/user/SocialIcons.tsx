import React from 'react';
import { useNode } from '@craftjs/core';
import { SocialIconsSettings } from './SocialIconsSettings';

export interface SocialIcon {
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok' | 'whatsapp' | 'snapchat';
  url: string;
}

export interface SocialIconsProps {
  icons?: SocialIcon[];
  size?: number;
  shape?: 'circle' | 'square' | 'rounded';
  style?: 'default' | 'colored' | 'minimal';
  spacing?: number;
}

export const SocialIcons: React.FC<SocialIconsProps> = ({
  icons = [
    { platform: 'facebook', url: 'https://facebook.com' },
    { platform: 'twitter', url: 'https://twitter.com' },
    { platform: 'instagram', url: 'https://instagram.com' }
  ],
  size = 40,
  shape = 'circle',
  style = 'colored',
  spacing = 12
}) => {
  const {
    connectors: { connect, drag },
    selected
  } = useNode((state) => ({
    selected: state.events.selected
  }));

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      facebook: '#1877f2',
      twitter: '#1da1f2',
      instagram: '#e4405f',
      linkedin: '#0077b5',
      youtube: '#ff0000',
      tiktok: '#000000',
      whatsapp: '#25d366',
      snapchat: '#fffc00'
    };
    return colors[platform] || '#6b7280';
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      facebook: 'f',
      twitter: '𝕏',
      instagram: '📷',
      linkedin: 'in',
      youtube: '▶',
      tiktok: '♪',
      whatsapp: '💬',
      snapchat: '👻'
    };
    return icons[platform] || '•';
  };

  const getShapeStyle = () => {
    switch (shape) {
      case 'circle':
        return { borderRadius: '50%' };
      case 'square':
        return { borderRadius: '0' };
      case 'rounded':
        return { borderRadius: '8px' };
      default:
        return { borderRadius: '50%' };
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
          🔗 أيقونات اجتماعية
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: `${spacing}px`,
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
      >
        {icons.map((icon, index) => {
          const bgColor = style === 'colored' ? getPlatformColor(icon.platform) : '#6b7280';
          const textColor = style === 'minimal' ? getPlatformColor(icon.platform) : 'white';
          const bg = style === 'minimal' ? 'transparent' : bgColor;
          const border = style === 'minimal' ? `2px solid ${getPlatformColor(icon.platform)}` : 'none';

          return (
            <a
              key={index}
              href={icon.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: bg,
                color: textColor,
                border,
                fontSize: `${size * 0.5}px`,
                fontWeight: 'bold',
                textDecoration: 'none',
                transition: 'all 0.2s',
                cursor: 'pointer',
                ...getShapeStyle()
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.opacity = '1';
              }}
            >
              {getPlatformIcon(icon.platform)}
            </a>
          );
        })}
      </div>
    </div>
  );
};

SocialIcons.craft = {
  displayName: 'أيقونات اجتماعية',
  props: {
    icons: [
      { platform: 'facebook', url: 'https://facebook.com' },
      { platform: 'twitter', url: 'https://twitter.com' },
      { platform: 'instagram', url: 'https://instagram.com' }
    ],
    size: 40,
    shape: 'circle',
    style: 'colored',
    spacing: 12
  },
  related: {
    settings: SocialIconsSettings
  }
};
