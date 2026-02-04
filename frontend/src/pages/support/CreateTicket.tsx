import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import supportService from '../../services/supportService';
import ThemeToggle from '../../components/ui/theme-toggle';


interface AttachmentFile {
  file: File;
  preview?: string;
}

const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    content: ''
  });
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);


  // ... (categories array and handlers remain the same) ...
  const categories = [
    { value: 'technical', label: 'مشكلة تقنية' },
    { value: 'billing', label: 'فواتير واشتراكات' },
    { value: 'inquiry', label: 'استفسار عام' },
    { value: 'suggestion', label: 'اقتراح' },
    { value: 'complaint', label: 'شكوى' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (attachments.length + files.length > maxFiles) {
      setError(`يمكنك رفع ${maxFiles} ملفات كحد أقصى`);
      return;
    }

    const validFiles: AttachmentFile[] = [];

    files.forEach(file => {
      if (file.size > maxSize) {
        setError(`حجم الملف ${file.name} كبير جداً (الحد الأقصى 10 ميجابايت)`);
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

      if (!allowedTypes.includes(file.type)) {
        setError(`نوع الملف ${file.name} غير مسموح`);
        return;
      }

      const attachmentFile: AttachmentFile = { file };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachmentFile.preview = e.target?.result as string;
          setAttachments(prev => [...prev, attachmentFile]);
        };
        reader.readAsDataURL(file);
      } else {
        validFiles.push(attachmentFile);
      }
    });

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
    }

    // Clear the input
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim() || !formData.category || !formData.content.trim()) {
      setError('جميع الحقول مطلوبة');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('content', formData.content);

      // Add attachments
      attachments.forEach(attachment => {
        formDataToSend.append('attachments', attachment.file);
      });

      const data = await supportService.createTicket(formDataToSend);

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(`/support/tickets/${data.ticket.ticketId}`);
        }, 2000);
      } else {
        setError(data.message || 'حدث خطأ في إنشاء التذكرة');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'حدث خطأ في إنشاء التذكرة');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center max-w-md">
            <CheckCircle className="w-16 h-16 text-green-500 dark:text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              تم إنشاء التذكرة بنجاح!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              سيتم توجيهك إلى صفحة التذكرة خلال ثوانٍ...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => navigate('/support')}
                className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <ArrowLeft className="w-4 h-4 ml-2" />
                العودة إلى مركز الدعم
              </button>
              <ThemeToggle />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              إنشاء تذكرة دعم جديدة
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              أخبرنا عن مشكلتك أو استفسارك وسنساعدك في أسرع وقت ممكن
            </p>
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 ml-3" />
                <span className="text-red-700 dark:text-red-300">{error}</span>
              </div>
            )}

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                عنوان التذكرة *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="اكتب عنواناً واضحاً ومختصراً لمشكلتك"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                maxLength={200}
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.subject.length}/200 حرف
              </p>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع المشكلة *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">اختر نوع المشكلة</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                وصف المشكلة *
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="اشرح مشكلتك بالتفصيل. كلما كان الوصف أوضح، كلما تمكنا من مساعدتك بشكل أفضل."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                المرفقات (اختياري)
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  اسحب الملفات هنا أو اضغط للاختيار
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  الحد الأقصى: 5 ملفات، 10 ميجابايت لكل ملف
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 ml-2" />
                  اختيار الملفات
                </label>
              </div>

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">الملفات المرفقة:</h4>
                  {attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        {attachment.preview ? (
                          <img
                            src={attachment.preview}
                            alt="Preview"
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                            <Upload className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {attachment.file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(attachment.file.size / 1024 / 1024).toFixed(2)} ميجابايت
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 space-x-reverse pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate('/support')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري الإرسال...
                  </>
                ) : (
                  'إرسال التذكرة'
                )}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
  );
};

export default CreateTicket;

