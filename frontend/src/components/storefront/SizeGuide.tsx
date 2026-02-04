import React, { useState } from 'react';
import { XMarkIcon, ScaleIcon } from '@heroicons/react/24/outline';

interface SizeGuideProps {
  enabled: boolean;
  showOnProduct: boolean;
  sizeGuide?: string;
  productName?: string;
}

const SizeGuide: React.FC<SizeGuideProps> = ({
  enabled,
  showOnProduct,
  sizeGuide,
  productName
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // إذا كانت الميزة معطلة أو لا يوجد دليل مقاسات، لا نعرض شيئاً
  if (!enabled || !showOnProduct || !sizeGuide) {
    return null;
  }

  // دليل المقاسات الافتراضي إذا لم يتم توفير واحد
  const defaultSizeGuide = `
# دليل المقاسات

## مقاسات الأحذية النسائية
| المقاس | الطول (سم) | العرض (سم) |
|--------|------------|------------|
| 35     | 22.5       | 8.5        |
| 36     | 23         | 8.7        |
| 37     | 23.5       | 9          |
| 38     | 24         | 9.2        |
| 39     | 24.5       | 9.5        |
| 40     | 25         | 9.7        |
| 41     | 25.5       | 10         |
| 42     | 26         | 10.2       |

## مقاسات الأحذية الرجالية
| المقاس | الطول (سم) | العرض (سم) |
|--------|------------|------------|
| 39     | 25         | 9.5        |
| 40     | 25.5       | 9.7        |
| 41     | 26         | 10         |
| 42     | 26.5       | 10.2       |
| 43     | 27         | 10.5       |
| 44     | 27.5       | 10.7       |
| 45     | 28         | 11         |
| 46     | 28.5       | 11.2       |

## مقاسات الأطفال
| المقاس | الطول (سم) | العرض (سم) |
|--------|------------|------------|
| 25     | 16         | 6.5        |
| 26     | 16.5       | 6.7        |
| 27     | 17         | 7          |
| 28     | 17.5       | 7.2        |
| 29     | 18         | 7.5        |
| 30     | 18.5       | 7.7        |
| 31     | 19         | 8          |
| 32     | 19.5       | 8.2        |
| 33     | 20         | 8.5        |
| 34     | 20.5       | 8.7        |
| 35     | 21         | 9          |

## نصائح لاختيار المقاس المناسب
- قم بقياس قدمك في نهاية اليوم عندما تكون القدم في أكبر حجم لها
- اترك مسافة حوالي 1 سم بين إصبع القدم الأطول ونهاية الحذاء
- إذا كان مقاسك بين مقاسين، اختر المقاس الأكبر
- تختلف المقاسات حسب نوع الحذاء والماركة
`;

  const guideContent = sizeGuide || defaultSizeGuide;

  // تحويل Markdown بسيط إلى HTML
  const parseMarkdown = (text: string) => {
    if (!text) return '';
    
    let html = text;
    const lines = html.split('\n');
    const result: string[] = [];
    let inTable = false;
    let tableRows: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // اكتشاف الجداول
      if (line.includes('|') && line.split('|').length > 2) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        tableRows.push(line);
        continue;
      } else if (inTable) {
        // إنهاء الجدول
        inTable = false;
        if (tableRows.length > 0) {
          result.push(renderTable(tableRows));
          tableRows = [];
        }
      }
      
      // العناوين
      if (line.startsWith('### ')) {
        result.push(`<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-900">${line.substring(4)}</h3>`);
      } else if (line.startsWith('## ')) {
        result.push(`<h2 class="text-xl font-bold mt-6 mb-3 text-gray-900">${line.substring(3)}</h2>`);
      } else if (line.startsWith('# ')) {
        result.push(`<h1 class="text-2xl font-bold mt-4 mb-4 text-gray-900">${line.substring(2)}</h1>`);
      } else if (line.trim() === '') {
        result.push('<br/>');
      } else {
        result.push(`<p class="mb-2 text-gray-700 leading-relaxed">${line}</p>`);
      }
    }
    
    // معالجة أي جدول متبقي
    if (inTable && tableRows.length > 0) {
      result.push(renderTable(tableRows));
    }
    
    return result.join('');
  };
  
  const renderTable = (rows: string[]): string => {
    if (rows.length === 0) return '';
    
    // استخراج الخلايا من كل صف
    const processedRows = rows.map(row => {
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
      return cells;
    });
    
    if (processedRows.length === 0) return '';
    
    let table = '<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-gray-300">';
    
    // الصف الأول كرأس
    if (processedRows.length > 0) {
      table += '<thead><tr class="bg-gray-100">';
      processedRows[0].forEach((cell: string) => {
        table += `<th class="px-4 py-2 border border-gray-300 font-semibold text-right text-gray-900">${cell}</th>`;
      });
      table += '</tr></thead>';
    }
    
    // باقي الصفوف
    if (processedRows.length > 1) {
      table += '<tbody>';
      for (let i = 1; i < processedRows.length; i++) {
        table += '<tr>';
        processedRows[i].forEach((cell: string) => {
          table += `<td class="px-4 py-2 border border-gray-300 text-right text-gray-700">${cell}</td>`;
        });
        table += '</tr>';
      }
      table += '</tbody>';
    }
    
    table += '</table></div>';
    return table;
  };

  return (
    <>
      {/* زر فتح دليل المقاسات */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
      >
        <ScaleIcon className="w-5 h-5" />
        <span>دليل المقاسات</span>
      </button>

      {/* Modal دليل المقاسات */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setIsOpen(false)}
            ></div>

            {/* Modal Panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  دليل المقاسات
                  {productName && (
                    <span className="block text-sm font-normal text-gray-600 mt-1">
                      {productName}
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(guideContent) }}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SizeGuide;

