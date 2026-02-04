import React, { useState, useEffect } from 'react';
import { FileText, Upload, Download, Trash2, CheckCircle, XCircle, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';

interface Document {
  id: string;
  name: string;
  type: string;
  fileUrl: string;
  fileSize?: number;
  expiryDate?: string;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
}

const Documents: React.FC = () => {
  const { employeeId } = useParams<{ employeeId?: string }>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'other',
    expiryDate: '',
    notes: ''
  });

  useEffect(() => {
    if (employeeId) {
      fetchDocuments();
    }
  }, [employeeId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/hr/documents/employee/${employeeId}`);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('فشل في جلب المستندات');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      if (!formData.name) {
        setFormData({ ...formData, name: e.target.files[0].name });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !employeeId) {
      toast.error('الرجاء اختيار ملف');
      return;
    }

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('employeeId', employeeId);
      uploadFormData.append('name', formData.name);
      uploadFormData.append('type', formData.type);
      if (formData.expiryDate) uploadFormData.append('expiryDate', formData.expiryDate);
      if (formData.notes) uploadFormData.append('notes', formData.notes);

      await api.post('/hr/documents', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('تم رفع المستند بنجاح');
      setUploadDialog(false);
      setSelectedFile(null);
      setFormData({ name: '', type: 'other', expiryDate: '', notes: '' });
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.error || 'فشل في رفع المستند');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستند؟')) return;

    try {
      await api.delete(`/hr/documents/${id}`);
      toast.success('تم حذف المستند بنجاح');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('فشل في حذف المستند');
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await api.post(`/hr/documents/${id}/verify`);
      toast.success('تم التحقق من المستند');
      fetchDocuments();
    } catch (error) {
      console.error('Error verifying document:', error);
      toast.error('فشل في التحقق من المستند');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const daysUntilExpiry = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  if (!employeeId) {
    return (
      <div className="p-6" dir="rtl">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">الرجاء اختيار موظف لعرض مستنداته</p>
            <Button onClick={() => navigate('/hr/employees')} className="mt-4">
              العودة إلى الموظفين
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">مستندات الموظف</h1>
          <p className="text-gray-500 mt-1">إدارة مستندات الموظف</p>
        </div>
        <Button onClick={() => setUploadDialog(true)}>
          <Upload className="h-4 w-4 ml-2" />
          رفع مستند
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">لا توجد مستندات</p>
            <Button onClick={() => setUploadDialog(true)}>
              <Upload className="h-4 w-4 ml-2" />
              رفع أول مستند
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className={isExpired(doc.expiryDate) ? 'border-red-500' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div className="flex gap-2">
                    {doc.isVerified ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg">{doc.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">النوع:</span>
                    <Badge>{doc.type}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">الحجم:</span>
                    <span>{formatFileSize(doc.fileSize)}</span>
                  </div>
                  {doc.expiryDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">تاريخ الانتهاء:</span>
                      <div className="flex items-center gap-2">
                        {isExpired(doc.expiryDate) && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        {isExpiringSoon(doc.expiryDate) && !isExpired(doc.expiryDate) && (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className={isExpired(doc.expiryDate) ? 'text-red-500' : ''}>
                          {new Date(doc.expiryDate).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.fileUrl, '_blank')}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 ml-2" />
                      تحميل
                    </Button>
                    {!doc.isVerified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerify(doc.id)}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 ml-2" />
                        تحقق
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>رفع مستند جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الملف</Label>
              <Input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
            </div>
            <div>
              <Label>اسم المستند</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="اسم المستند"
              />
            </div>
            <div>
              <Label>نوع المستند</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">عقد عمل</SelectItem>
                  <SelectItem value="id">هوية/جواز سفر</SelectItem>
                  <SelectItem value="certificate">شهادة</SelectItem>
                  <SelectItem value="medical">طبي</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاريخ الانتهاء (اختياري)</Label>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
            <div>
              <Label>ملاحظات (اختياري)</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpload}>رفع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;












































