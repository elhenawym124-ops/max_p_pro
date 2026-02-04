import React from 'react';
import { Editor, Frame, Element } from '@craftjs/core';
import { Toolbox, SettingsPanel, Topbar } from '../components/page-builder/editor';
import {
  Text,
  Button,
  Container,
  Image,
  ProductCard,
  CountdownTimer,
  Heading,
  Divider,
  Spacer,
  Tabs,
  Accordion,
  Alert,
  Counter,
  StarRating,
  ProgressBar,
  SocialIcons
} from '../components/page-builder/user';

const PageBuilder: React.FC = () => {
  const handleSave = (json: string) => {
    // هنا يمكنك إرسال البيانات للـ Backend
    console.log('Saving to backend:', json);
    // مثال:
    // fetch('/api/v1/landing-pages', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ content: json })
    // });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Editor
        resolver={{
          Text,
          Button,
          Container,
          Image,
          ProductCard,
          CountdownTimer,
          Heading,
          Divider,
          Spacer,
          Tabs,
          Accordion,
          Alert,
          Counter,
          StarRating,
          ProgressBar,
          SocialIcons
        }}
      >
        <Topbar onSave={handleSave} />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Toolbox - Left Panel */}
          <Toolbox />

          {/* Canvas - Main Editor Area */}
          <div
            style={{
              flex: 1,
              background: '#e5e5e5',
              padding: '40px 20px',
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '1200px',
                background: 'white',
                minHeight: '100%',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <Frame>
                <Element
                  id="root_container"
                  is={Container}
                  canvas
                  background="#ffffff"
                  padding={40}
                />
              </Frame>
            </div>
          </div>

          {/* Settings Panel - Right Panel */}
          <SettingsPanel />
        </div>
      </Editor>
    </div>
  );
};

export default PageBuilder;
