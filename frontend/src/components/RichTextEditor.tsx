import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { uploadFiles } from '../utils/apiHelpers';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// Suppress findDOMNode warning from react-quill (known issue with React 18)
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && (
    args[0].includes('findDOMNode') ||
    args[0].includes('turbo/governments') ||
    args[0].includes('Failed to fetch governments')
  )) {
    return;
  }
  originalError.call(console, ...args);
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'اكتب الوصف هنا...',
  minHeight = '200px'
}) => {
  const quillRef = useRef<ReactQuill>(null);

  // Handle image upload
  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        // Upload image to server
        const result = await uploadFiles([file]);
        if (result.success && result.data?.[0]) {
          const imageUrl = result.data[0].fullUrl || result.data[0].url;
          
          // Insert image into editor
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection();
            if (range) {
              quill.insertEmbed(range.index, 'image', imageUrl);
              quill.setSelection(range.index + 1);
            }
          }
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('فشل في رفع الصورة');
      }
    };
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: handleImageUpload
      }
    },
  }), [handleImageUpload]);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'color', 'background',
    'align',
    'link', 'image'
  ];

  // Ensure value is always a string
  const editorValue = value || '';

  return (
    <div className="rich-text-editor">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={editorValue}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ minHeight }}
      />
      <style>{`
        .rich-text-editor .ql-container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 14px;
          direction: rtl;
        }
        .rich-text-editor .ql-editor {
          min-height: ${minHeight};
          direction: rtl;
          text-align: right;
        }
        .rich-text-editor .ql-toolbar {
          direction: rtl;
          border-top-right-radius: 0.375rem;
          border-top-left-radius: 0.375rem;
        }
        .rich-text-editor .ql-container {
          border-bottom-right-radius: 0.375rem;
          border-bottom-left-radius: 0.375rem;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          right: 15px;
          left: auto;
          font-style: normal;
          color: #9ca3af;
        }
        
        /* Dark mode styles */
        .dark .rich-text-editor .ql-toolbar {
          background-color: #374151;
          border-color: #4b5563;
        }
        
        .dark .rich-text-editor .ql-container {
          border-color: #4b5563;
        }
        
        .dark .rich-text-editor .ql-editor {
          background-color: #374151;
          color: #f9fafb;
        }
        
        .dark .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: #d1d5db;
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-fill {
          fill: #d1d5db;
        }
        
        .dark .rich-text-editor .ql-toolbar button:hover {
          background-color: #4b5563;
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-picker-label {
          color: #d1d5db;
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-picker-options {
          background-color: #374151;
          border-color: #4b5563;
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-picker-item {
          color: #d1d5db;
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-picker-item:hover {
          background-color: #4b5563;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;

