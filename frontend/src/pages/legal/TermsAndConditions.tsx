import React, { useState, useEffect } from 'react';
import { DocumentCheckIcon, PencilIcon, EyeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../../../styles/quill-dark-mode.css';

const TermsAndConditions: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      // TODO: استبدل هذا بـ API call حقيقي
      const savedContent = localStorage.getItem('terms_and_conditions');
      const savedDate = localStorage.getItem('terms_and_conditions_date');
      
      if (savedContent) {
        setContent(savedContent);
        setLastUpdated(savedDate || '');
      } else {
        // محتوى افتراضي
        setContent(`
          <h1>الشروط والأحكام</h1>
          <p>مرحباً بك في منصتنا. باستخدامك لهذه المنصة، فإنك توافق على الالتزام بالشروط والأحكام التالية:</p>
          
          <h2>1. استخدام المنصة</h2>
          <p>يجب استخدام المنصة للأغراض المشروعة فقط وبما يتوافق مع جميع القوانين واللوائح المعمول بها.</p>
          
          <h2>2. حقوق الملكية الفكرية</h2>
          <p>جميع المحتويات والمواد المتاحة على المنصة محمية بموجب قوانين حقوق النشر والملكية الفكرية.</p>
          
          <h2>3. المسؤولية</h2>
          <p>نحن غير مسؤولين عن أي أضرار مباشرة أو غير مباشرة قد تنتج عن استخدام المنصة.</p>
          
          <h2>4. التعديلات</h2>
          <p>نحتفظ بالحق في تعديل هذه الشروط والأحكام في أي وقت دون إشعار مسبق.</p>
          
          <h2>5. الاتصال بنا</h2>
          <p>إذا كان لديك أي أسئلة حول هذه الشروط والأحكام، يرجى الاتصال بنا.</p>
        `);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('فشل تحميل المحتوى');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // TODO: استبدل هذا بـ API call حقيقي
      localStorage.setItem('terms_and_conditions', content);
      const now = new Date().toLocaleString('ar-EG');
      localStorage.setItem('terms_and_conditions_date', now);
      setLastUpdated(now);
      
      toast.success('تم حفظ الشروط والأحكام بنجاح');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('فشل حفظ المحتوى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <DocumentCheckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                الشروط والأحكام
              </h1>
              {lastUpdated && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  آخر تحديث: {lastUpdated}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  disabled={loading}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PencilIcon className="h-5 w-5" />
                <span>تعديل</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        {loading && !content ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3 space-x-reverse">
                <EyeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium mb-1">نصائح للتحرير:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>استخدم العناوين لتنظيم المحتوى</li>
                    <li>اكتب بلغة واضحة وسهلة الفهم</li>
                    <li>تأكد من تغطية جميع النقاط القانونية المهمة</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="dark-mode-quill">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={modules}
                className="bg-white dark:bg-gray-900 rounded-lg dark:text-white"
                style={{ minHeight: '400px' }}
              />
            </div>
          </div>
        ) : (
          <div 
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>

      {/* Info Card */}
      {!isEditing && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start space-x-3 space-x-reverse">
            <DocumentCheckIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium mb-1">معلومات مهمة</p>
              <p>
                هذه الشروط والأحكام تُعرض للعملاء والمستخدمين. تأكد من مراجعتها وتحديثها بانتظام لتتوافق مع القوانين المحلية.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Quill modules configuration
const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'direction': 'rtl' }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'font': [] }],
    [{ 'align': [] }],
    ['clean'],
    ['link']
  ]
};

export default TermsAndConditions;
