import React from 'react';

interface SimpleChartProps {
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  title: string;
  type?: 'bar' | 'line' | 'donut';
}

const SimpleChart: React.FC<SimpleChartProps> = ({ data, title, type = 'bar' }) => {
  const maxValue = Math.max(...data.map(item => item.value));

  if (type === 'donut') {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>
        <div className="flex items-center justify-center">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="8"
              />
              {data.map((item, index) => {
                const percentage = (item.value / total) * 100;
                const strokeDasharray = `${percentage * 2.51} ${251 - percentage * 2.51}`;
                const strokeDashoffset = -cumulativePercentage * 2.51;
                cumulativePercentage += percentage;

                return (
                  <circle
                    key={index}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="8"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                    style={{
                      animationDelay: `${index * 0.2}s`
                    }}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{total}</div>
                <div className="text-sm text-gray-500">المجموع</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-3"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900">{item.value}</span>
                <span className="text-xs text-gray-500 ml-1">
                  ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'line') {
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * 300;
      const y = 150 - (item.value / maxValue) * 120;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>
        <div className="relative">
          <svg className="w-full h-40" viewBox="0 0 300 150">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={i}
                x1="0"
                y1={30 + i * 30}
                x2="300"
                y2={30 + i * 30}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            ))}
            
            {/* Line */}
            <polyline
              points={points}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-pulse"
            />
            
            {/* Points */}
            {data.map((item, index) => {
              const x = (index / (data.length - 1)) * 300;
              const y = 150 - (item.value / maxValue) * 120;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={item.color}
                  className="hover:r-6 transition-all duration-200"
                />
              );
            })}
            
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="flex justify-between mt-4 text-xs text-gray-500">
          {data.map((item, index) => (
            <span key={index}>{item.label}</span>
          ))}
        </div>
      </div>
    );
  }

  // Default bar chart
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <span className="text-sm font-bold text-gray-900">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color,
                  animationDelay: `${index * 0.1}s`
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleChart;
