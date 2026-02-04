import React from 'react';
import { useNode } from '@craftjs/core';
import { SocialIconsProps, SocialIcon } from './SocialIcons';

export const SocialIconsSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node) => ({
    props: node.data.props as SocialIconsProps
  }));

  const platforms = [
    { value: 'facebook', label: 'Facebook' },
    { value: 'twitter', label: 'Twitter (X)' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'snapchat', label: 'Snapchat' }
  ];

  const addIcon = () => {
    setProp((props: SocialIconsProps) => {
      props.icons = [
        ...(props.icons || []),
        { platform: 'facebook', url: 'https://facebook.com' }
      ];
    });
  };

  const removeIcon = (index: number) => {
    setProp((props: SocialIconsProps) => {
      props.icons = props.icons?.filter((_, i) => i !== index);
    });
  };

  const updateIcon = (index: number, field: keyof SocialIcon, value: string) => {
    setProp((props: SocialIconsProps) => {
      if (props.icons && props.icons[index]) {
        props.icons[index][field] = value as any;
      }
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500 }}>الأيقونات</label>
          <button
            onClick={addIcon}
            style={{
              padding: '6px 12px',
              background: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            + إضافة
          </button>
        </div>

        {props.icons?.map((icon, index) => (
          <div
            key={index}
            style={{
              marginBottom: '12px',
              padding: '12px',
              background: '#2a2a2a',
              borderRadius: '6px',
              border: '1px solid #333'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>الأيقونة {index + 1}</span>
              {props.icons && props.icons.length > 1 && (
                <button
                  onClick={() => removeIcon(index)}
                  style={{
                    padding: '2px 8px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  حذف
                </button>
              )}
            </div>

            <select
              value={icon.platform}
              onChange={(e) => updateIcon(index, 'platform', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '8px',
                border: '1px solid #444',
                borderRadius: '4px',
                background: '#1a1a1a',
                color: 'white',
                fontSize: '13px'
              }}
            >
              {platforms.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>

            <input
              type="url"
              value={icon.url}
              onChange={(e) => updateIcon(index, 'url', e.target.value)}
              placeholder="https://..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #444',
                borderRadius: '4px',
                background: '#1a1a1a',
                color: 'white',
                fontSize: '13px'
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          الحجم: {props.size}px
        </label>
        <input
          type="range"
          min="24"
          max="64"
          value={props.size}
          onChange={(e) => setProp((props: SocialIconsProps) => (props.size = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          الشكل
        </label>
        <select
          value={props.shape}
          onChange={(e) => setProp((props: SocialIconsProps) => (props.shape = e.target.value as any))}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #333',
            borderRadius: '4px',
            background: '#2a2a2a',
            color: 'white',
            fontSize: '13px'
          }}
        >
          <option value="circle">دائري</option>
          <option value="square">مربع</option>
          <option value="rounded">مربع مدور</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          النمط
        </label>
        <select
          value={props.style}
          onChange={(e) => setProp((props: SocialIconsProps) => (props.style = e.target.value as any))}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #333',
            borderRadius: '4px',
            background: '#2a2a2a',
            color: 'white',
            fontSize: '13px'
          }}
        >
          <option value="colored">ملون</option>
          <option value="default">افتراضي</option>
          <option value="minimal">بسيط</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          المسافة: {props.spacing}px
        </label>
        <input
          type="range"
          min="4"
          max="32"
          value={props.spacing}
          onChange={(e) => setProp((props: SocialIconsProps) => (props.spacing = parseInt(e.target.value)))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        padding: '12px',
        background: '#1f2937',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#9ca3af',
        lineHeight: 1.5
      }}>
        💡 أضف روابط حساباتك على مواقع التواصل الاجتماعي
      </div>
    </div>
  );
};
