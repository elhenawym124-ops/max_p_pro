import React, { useState } from 'react';
import { Element, useEditor } from '@craftjs/core';
import { Text, Button, Container, Image, ProductCard, CountdownTimer, Heading, Divider, Spacer, Tabs, Accordion, Alert, Counter, StarRating, ProgressBar, SocialIcons } from '../user';

export const Toolbox: React.FC = () => {
  const { connectors } = useEditor();
  const [activeTab, setActiveTab] = useState('basic');

  const widgets = {
    basic: [
      {
        name: 'عنوان',
        icon: '📌',
        component: <Element id="heading_element" is={Heading} text="عنوان الصفحة" />,
        description: 'عناوين H1-H6'
      },
      {
        name: 'نص',
        icon: '📝',
        component: <Element id="text_element" is={Text} text="اكتب النص هنا..." />,
        description: 'إضافة نص'
      },
      {
        name: 'زر',
        icon: '🔘',
        component: <Element id="button_element" is={Button} text="اضغط هنا" />,
        description: 'زر تفاعلي'
      },
      {
        name: 'صورة',
        icon: '🖼️',
        component: <Element id="image_element" is={Image} />,
        description: 'إضافة صورة'
      },
      {
        name: 'فاصل',
        icon: '➖',
        component: <Element id="divider_element" is={Divider} />,
        description: 'خط فاصل'
      },
      {
        name: 'مسافة',
        icon: '📏',
        component: <Element id="spacer_element" is={Spacer} />,
        description: 'مسافة عمودية'
      },
      {
        name: 'تبويبات',
        icon: '📑',
        component: <Element id="tabs_element" is={Tabs} />,
        description: 'تنظيم المحتوى'
      },
      {
        name: 'أكورديون',
        icon: '📋',
        component: <Element id="accordion_element" is={Accordion} />,
        description: 'أسئلة وأجوبة'
      },
      {
        name: 'تنبيه',
        icon: '🔔',
        component: <Element id="alert_element" is={Alert} />,
        description: 'رسائل تنبيه'
      },
      {
        name: 'عداد',
        icon: '🔢',
        component: <Element id="counter_element" is={Counter} />,
        description: 'عداد متحرك'
      },
      {
        name: 'تقييم',
        icon: '⭐',
        component: <Element id="star_rating_element" is={StarRating} />,
        description: 'تقييم نجوم'
      },
      {
        name: 'شريط تقدم',
        icon: '📊',
        component: <Element id="progress_bar_element" is={ProgressBar} />,
        description: 'شريط تقدم'
      },
      {
        name: 'أيقونات اجتماعية',
        icon: '🔗',
        component: <Element id="social_icons_element" is={SocialIcons} />,
        description: 'روابط اجتماعية'
      },
      {
        name: 'حاوية',
        icon: '📦',
        component: <Element id="container_element" is={Container} canvas />,
        description: 'حاوية للعناصر'
      }
    ],
    ecommerce: [
      {
        name: 'بطاقة منتج',
        icon: '🛍️',
        component: <Element id="product_card_element" is={ProductCard} />,
        description: 'عرض منتج'
      },
      {
        name: 'عداد تنازلي',
        icon: '⏰',
        component: <Element id="countdown_timer_element" is={CountdownTimer} />,
        description: 'عداد للعروض'
      }
    ]
  };

  const tabs = [
    { id: 'basic', label: 'أساسي', icon: '🧩' },
    { id: 'ecommerce', label: 'متجر', icon: '🛒' }
  ];

  return (
    <div
      style={{
        width: '280px',
        background: '#1e1e1e',
        color: 'white',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #333'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid #333'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>🧩 الأدوات</h3>
        <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#888' }}>اسحب وأفلت في الصفحة</p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #333',
          background: '#2a2a2a'
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === tab.id ? '#4F46E5' : 'transparent',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Widgets Grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '15px'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px'
          }}
        >
          {widgets[activeTab as keyof typeof widgets].map((widget, index) => (
            <div
              key={index}
              ref={(ref) => ref && connectors.create(ref, widget.component)}
              style={{
                background: '#2a2a2a',
                padding: '20px 10px',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'grab',
                border: '1px solid #333',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#333';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2a2a2a';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{widget.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{widget.name}</div>
              <div style={{ fontSize: '10px', color: '#888' }}>{widget.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: '15px',
          borderTop: '1px solid #333',
          fontSize: '11px',
          color: '#888',
          textAlign: 'center'
        }}
      >
        💡 اسحب الأداة وأفلتها في الصفحة
      </div>
    </div>
  );
};
