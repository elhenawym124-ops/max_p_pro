import React from 'react';
import { useNode } from '@craftjs/core';
import { AlertSettings } from './AlertSettings';

export interface AlertProps {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message?: string;
  showIcon?: boolean;
  dismissible?: boolean;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title = '',
  message = 'هذه رسالة تنبيه',
  showIcon = true,
  dismissible = false
}) => {
  const {
    connectors: { connect, drag },
    selected
  } = useNode((state) => ({
    selected: state.events.selected
  }));

  const [isVisible, setIsVisible] = React.useState(true);

  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          background: '#d1fae5',
          border: '#10b981',
          text: '#065f46',
          icon: '✓'
        };
      case 'warning':
        return {
          background: '#fef3c7',
          border: '#f59e0b',
          text: '#92400e',
          icon: '⚠'
        };
      case 'error':
        return {
          background: '#fee2e2',
          border: '#ef4444',
          text: '#991b1b',
          icon: '✕'
        };
      case 'info':
      default:
        return {
          background: '#dbeafe',
          border: '#3b82f6',
          text: '#1e40af',
          icon: 'ℹ'
        };
    }
  };

  const styles = getTypeStyles();

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
          🔔 تنبيه
        </div>
      )}

      <div
        style={{
          background: styles.background,
          border: `2px solid ${styles.border}`,
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          position: 'relative'
        }}
      >
        {showIcon && (
          <div
            style={{
              fontSize: '24px',
              color: styles.text,
              fontWeight: 'bold',
              flexShrink: 0
            }}
          >
            {styles.icon}
          </div>
        )}

        <div style={{ flex: 1 }}>
          {title && (
            <div
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: styles.text,
                marginBottom: title && message ? '4px' : 0
              }}
            >
              {title}
            </div>
          )}
          {message && (
            <div
              style={{
                fontSize: '14px',
                color: styles.text,
                lineHeight: 1.5
              }}
            >
              {message}
            </div>
          )}
        </div>

        {dismissible && (
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: styles.text,
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
              flexShrink: 0
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

Alert.craft = {
  displayName: 'تنبيه',
  props: {
    type: 'info',
    title: '',
    message: 'هذه رسالة تنبيه',
    showIcon: true,
    dismissible: false
  },
  related: {
    settings: AlertSettings
  }
};
