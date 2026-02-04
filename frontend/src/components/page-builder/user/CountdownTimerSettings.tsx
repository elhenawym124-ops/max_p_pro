import React from 'react';
import { useNode } from '@craftjs/core';
import { CountdownTimerProps } from './CountdownTimer';

export const CountdownTimerSettings: React.FC = () => {
  const {
    actions: { setProp },
    props
  } = useNode((node: any) => ({
    props: node.data.props as CountdownTimerProps
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          العنوان
        </label>
        <input
          type="text"
          value={props.title}
          onChange={(e) => setProp((props: CountdownTimerProps) => (props.title = e.target.value))}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #333',
            borderRadius: '4px',
            background: '#2a2a2a',
            color: 'white',
            fontSize: '13px'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          تاريخ الانتهاء
        </label>
        <input
          type="datetime-local"
          value={props.endDate ? new Date(props.endDate).toISOString().slice(0, 16) : ''}
          onChange={(e) => setProp((props: CountdownTimerProps) => (props.endDate = new Date(e.target.value).toISOString()))}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #333',
            borderRadius: '4px',
            background: '#2a2a2a',
            color: 'white',
            fontSize: '13px'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
          لون الخلفية
        </label>
        <input
          type="color"
          value={props.backgroundColor}
          onChange={(e) => setProp((props: CountdownTimerProps) => (props.backgroundColor = e.target.value))}
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
          لون النص
        </label>
        <input
          type="color"
          value={props.textColor}
          onChange={(e) => setProp((props: CountdownTimerProps) => (props.textColor = e.target.value))}
          style={{
            width: '100%',
            height: '40px',
            border: '1px solid #333',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        />
      </div>
    </div>
  );
};
