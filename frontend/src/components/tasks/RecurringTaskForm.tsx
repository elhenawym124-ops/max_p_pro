import React from 'react';
import {
  ArrowPathIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface RecurringConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek: number[];
  dayOfMonth: number;
  endType: 'never' | 'date' | 'count';
  endDate: string;
  endCount: number;
}

interface RecurringTaskFormProps {
  value: RecurringConfig;
  onChange: (config: RecurringConfig) => void;
}

const RecurringTaskForm: React.FC<RecurringTaskFormProps> = ({ value, onChange }) => {

  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const handleChange = (field: keyof RecurringConfig, newValue: any) => {
    onChange({ ...value, [field]: newValue });
  };

  const toggleDayOfWeek = (day: number) => {
    const newDays = value.daysOfWeek.includes(day)
      ? value.daysOfWeek.filter(d => d !== day)
      : [...value.daysOfWeek, day];
    handleChange('daysOfWeek', newDays);
  };

  const getFrequencyText = () => {
    switch (value.frequency) {
      case 'daily':
        return value.interval === 1 ? 'كل يوم' : `كل ${value.interval} أيام`;
      case 'weekly':
        return value.interval === 1 ? 'كل أسبوع' : `كل ${value.interval} أسابيع`;
      case 'monthly':
        return value.interval === 1 ? 'كل شهر' : `كل ${value.interval} أشهر`;
      case 'yearly':
        return value.interval === 1 ? 'كل سنة' : `كل ${value.interval} سنوات`;
      default:
        return '';
    }
  };

  const getEndText = () => {
    switch (value.endType) {
      case 'never':
        return 'بدون نهاية';
      case 'date':
        return `حتى ${value.endDate}`;
      case 'count':
        return `${value.endCount} مرات`;
      default:
        return '';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <ArrowPathIcon className="h-5 w-5 text-indigo-600 ml-2" />
          <h4 className="font-medium text-gray-900">مهمة متكررة</h4>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => handleChange('enabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {value.enabled && (
        <div className="space-y-4">
          {/* Frequency Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">التكرار</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'daily', label: 'يومي' },
                { value: 'weekly', label: 'أسبوعي' },
                { value: 'monthly', label: 'شهري' },
                { value: 'yearly', label: 'سنوي' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange('frequency', option.value)}
                  className={`px-3 py-2 text-sm font-medium rounded-md border ${
                    value.frequency === option.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كل
            </label>
            <div className="flex items-center space-x-2 space-x-reverse">
              <input
                type="number"
                min="1"
                max="365"
                value={value.interval}
                onChange={(e) => handleChange('interval', parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-gray-600">
                {value.frequency === 'daily' && 'يوم'}
                {value.frequency === 'weekly' && 'أسبوع'}
                {value.frequency === 'monthly' && 'شهر'}
                {value.frequency === 'yearly' && 'سنة'}
              </span>
            </div>
          </div>

          {/* Days of Week (for weekly) */}
          {value.frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">أيام الأسبوع</label>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDayOfWeek(index)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full ${
                      value.daysOfWeek.includes(index)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {value.frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">يوم الشهر</label>
              <select
                value={value.dayOfMonth}
                onChange={(e) => handleChange('dayOfMonth', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
                <option value={-1}>آخر يوم في الشهر</option>
              </select>
            </div>
          )}

          {/* End Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ينتهي</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="endType"
                  value="never"
                  checked={value.endType === 'never'}
                  onChange={() => handleChange('endType', 'never')}
                  className="ml-2"
                />
                <span className="text-sm text-gray-700">أبداً</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="endType"
                  value="date"
                  checked={value.endType === 'date'}
                  onChange={() => handleChange('endType', 'date')}
                  className="ml-2"
                />
                <span className="text-sm text-gray-700 ml-2">في تاريخ</span>
                {value.endType === 'date' && (
                  <input
                    type="date"
                    value={value.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    className="mr-2 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="endType"
                  value="count"
                  checked={value.endType === 'count'}
                  onChange={() => handleChange('endType', 'count')}
                  className="ml-2"
                />
                <span className="text-sm text-gray-700 ml-2">بعد</span>
                {value.endType === 'count' && (
                  <>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={value.endCount}
                      onChange={(e) => handleChange('endCount', parseInt(e.target.value) || 1)}
                      className="mr-2 w-16 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">مرة</span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
            <div className="flex items-center text-indigo-800">
              <CalendarIcon className="h-5 w-5 ml-2" />
              <span className="text-sm font-medium">
                ستتكرر هذه المهمة {getFrequencyText()}
                {value.frequency === 'weekly' && value.daysOfWeek.length > 0 && (
                  <> في أيام: {value.daysOfWeek.map(d => dayNames[d]).join('، ')}</>
                )}
                {value.frequency === 'monthly' && (
                  <> في اليوم {value.dayOfMonth === -1 ? 'الأخير' : value.dayOfMonth} من الشهر</>
                )}
                {' - '}
                {getEndText()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringTaskForm;

// Default recurring config
export const defaultRecurringConfig: RecurringConfig = {
  enabled: false,
  frequency: 'weekly',
  interval: 1,
  daysOfWeek: [0], // Sunday
  dayOfMonth: 1,
  endType: 'never',
  endDate: '',
  endCount: 10
};
