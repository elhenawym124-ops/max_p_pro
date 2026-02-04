/**
 * ⚠️ Enhanced Confirmation Dialog
 * مكون تأكيد محسّن للعمليات الحساسة
 */

import React, { useState } from 'react';
import { AlertTriangle, Trash2, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  type?: 'danger' | 'warning' | 'info';
  itemName?: string;
  itemDetails?: string;
  consequences?: string[];
  requireTyping?: boolean;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'تأكيد',
  type = 'danger',
  itemName,
  itemDetails,
  consequences = [],
  requireTyping = false,
  loading = false,
}) => {
  const [typedText, setTypedText] = useState('');
  const requiredText = 'حذف';

  const handleConfirm = () => {
    if (requireTyping && typedText !== requiredText) {
      return;
    }
    onConfirm();
    setTypedText('');
  };

  const handleClose = () => {
    setTypedText('');
    onOpenChange(false);
  };

  const colors = {
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      title: 'text-red-600',
      button: 'destructive',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      title: 'text-yellow-600',
      button: 'default',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      title: 'text-blue-600',
      button: 'default',
    },
  };

  const color = colors[type];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${color.title}`}>
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">{description}</p>

          {itemName && (
            <div className={`p-4 ${color.bg} border ${color.border} rounded-lg`}>
              <p className="font-bold">{itemName}</p>
              {itemDetails && (
                <p className="text-sm text-gray-600 mt-1">{itemDetails}</p>
              )}
            </div>
          )}

          {consequences.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
                ⚠️ تحذير: هذا الإجراء سيؤدي إلى:
              </p>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                {consequences.map((consequence, index) => (
                  <li key={index}>{consequence}</li>
                ))}
              </ul>
            </div>
          )}

          {requireTyping && (
            <div className="space-y-2">
              <Label>
                اكتب "<strong>{requiredText}</strong>" للتأكيد:
              </Label>
              <Input
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={requiredText}
                className="text-center font-bold"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            <X className="h-4 w-4 ml-2" />
            إلغاء
          </Button>
          <Button
            variant={color.button as any}
            onClick={handleConfirm}
            disabled={
              loading || (requireTyping && typedText !== requiredText)
            }
          >
            {loading ? (
              <>
                <div className="h-4 w-4 ml-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 ml-2" />
                {confirmText}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
