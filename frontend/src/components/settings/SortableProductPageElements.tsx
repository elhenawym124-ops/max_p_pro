import React, { useState } from 'react';
import { ArrowsUpDownIcon } from '@heroicons/react/24/outline';

export interface ProductPageElement {
  id: string;
  label: string;
  enabled: boolean;
}

interface SortableProductPageElementsProps {
  elements: ProductPageElement[];
  onOrderChange: (newOrder: string[]) => void;
  onToggle: (id: string, enabled: boolean) => void;
  disabled?: boolean;
}

const SortableProductPageElements: React.FC<SortableProductPageElementsProps> = ({
  elements,
  onOrderChange,
  onToggle,
  disabled = false
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (disabled || draggedIndex === null) return;
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (disabled || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    e.preventDefault();

    const newOrder = [...elements];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);

    const newOrderIds = newOrder.map(el => el.id);
    onOrderChange(newOrderIds);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        اسحب العناصر لأعلى أو لأسفل لترتيبها في صفحة المنتج
      </p>

      <div className="space-y-3">
        {elements.map((element, index) => (
          <div
            key={element.id}
            draggable={!disabled}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200
              ${draggedIndex === index
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 opacity-50 cursor-grabbing'
                : dragOverIndex === index
                  ? 'border-indigo-400 border-dashed bg-indigo-100/50 dark:bg-indigo-900/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-indigo-300 dark:hover:border-indigo-500/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-move shadow-sm hover:shadow-md'}
            `}
          >
            <div className="flex items-center gap-4 flex-1">
              {/* Drag Handle */}
              <div className={`text-gray-400 dark:text-gray-500 transition-colors ${disabled ? '' : 'hover:text-indigo-500 cursor-grab active:cursor-grabbing'}`}>
                <ArrowsUpDownIcon className="h-5 w-5" />
              </div>

              {/* Element Label */}
              <span className={`text-sm font-medium flex-1 ${disabled ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'}`}>
                {element.label}
              </span>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={element.enabled}
                  onChange={(e) => onToggle(element.id, e.target.checked)}
                  disabled={disabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500 peer-disabled:opacity-50"></div>
              </label>
            </div>
          </div>
        ))}
      </div>

      {elements.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6 bg-gray-50 dark:bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          لا توجد عناصر متاحة
        </p>
      )}
    </div>
  );
};

export default SortableProductPageElements;






































































