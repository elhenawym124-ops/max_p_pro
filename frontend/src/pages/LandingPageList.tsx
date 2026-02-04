import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAllLandingPages, 
  deleteLandingPage, 
  togglePublish,
  duplicateLandingPage,
  LandingPage 
} from '../services/landingPageService';
import toast from 'react-hot-toast';

const LandingPageList: React.FC = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPages();
  }, [search]);

  const loadPages = async () => {
    try {
      setLoading(true);
      const data = await getAllLandingPages({ search });
      setPages(data.pages);
    } catch (error) {
      console.error('Error loading pages:', error);
      toast.error('فشل تحميل الصفحات');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصفحة؟')) return;
    try {
      await deleteLandingPage(id);
      toast.success('تم حذف الصفحة بنجاح');
      loadPages();
    } catch (error) {
      toast.error('فشل حذف الصفحة');
    }
  };

  const handleTogglePublish = async (id: string) => {
    try {
      await togglePublish(id);
      toast.success('تم تحديث حالة النشر');
      loadPages();
    } catch (error) {
      toast.error('فشل تحديث حالة النشر');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await duplicateLandingPage(id);
      toast.success('تم نسخ الصفحة بنجاح');
      navigate(`/page-builder?id=${duplicated.id}`);
    } catch (error) {
      toast.error('فشل نسخ الصفحة');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: '0 0 10px', fontSize: '28px', fontWeight: 700 }}>صفحات Landing Pages</h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>إدارة صفحات الهبوط للمنتجات</p>
        </div>
        <button
          onClick={() => navigate('/page-builder')}
          style={{
            padding: '12px 24px',
            background: '#4F46E5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>➕</span>
          <span>إنشاء صفحة جديدة</span>
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 البحث عن صفحة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '12px 16px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p>جاري التحميل...</p>
        </div>
      )}

      {!loading && pages.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '12px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📄</div>
          <h3 style={{ margin: '0 0 10px', fontSize: '20px' }}>لا توجد صفحات بعد</h3>
          <p style={{ margin: '0 0 20px', color: '#666' }}>ابدأ بإنشاء أول صفحة landing page لمنتجاتك</p>
          <button
            onClick={() => navigate('/page-builder')}
            style={{
              padding: '12px 24px',
              background: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            إنشاء صفحة الآن
          </button>
        </div>
      )}

      {!loading && pages.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {pages.map((page) => (
            <div key={page.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    padding: '4px 12px',
                    background: page.isPublished ? '#D1FAE5' : '#FEE2E2',
                    color: page.isPublished ? '#065F46' : '#991B1B',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {page.isPublished ? '🟢 منشور' : '🔴 مسودة'}
                  </span>
                </div>
              </div>

              <div style={{ padding: '20px' }} onClick={() => navigate(`/page-builder?id=${page.id}`)}>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>{page.title}</h3>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>/{page.slug}</p>

                <div style={{ display: 'flex', gap: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#4F46E5' }}>{page.views}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>مشاهدة</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#10B981' }}>{page.conversions}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>تحويل</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px 20px', background: '#f9fafb', display: 'flex', gap: '8px' }}>
                <button onClick={(e) => { e.stopPropagation(); handleTogglePublish(page.id); }}
                  style={{ flex: 1, padding: '8px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>
                  {page.isPublished ? '📥' : '📤'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDuplicate(page.id); }}
                  style={{ flex: 1, padding: '8px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>
                  📋
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(page.id); }}
                  style={{ flex: 1, padding: '8px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '6px', cursor: 'pointer' }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandingPageList;
