import React from 'react';

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = { default: 1, sm: 2, md: 3, lg: 4, xl: 5 },
  gap = 4,
  className = '',
}) => {
  const getGridClasses = () => {
    const classes = ['grid'];
    
    // Default columns
    if (cols.default) {
      classes.push(`grid-cols-${cols.default}`);
    }
    
    // Responsive columns
    if (cols.sm) {
      classes.push(`sm:grid-cols-${cols.sm}`);
    }
    if (cols.md) {
      classes.push(`md:grid-cols-${cols.md}`);
    }
    if (cols.lg) {
      classes.push(`lg:grid-cols-${cols.lg}`);
    }
    if (cols.xl) {
      classes.push(`xl:grid-cols-${cols.xl}`);
    }
    
    // Gap
    classes.push(`gap-${gap}`);
    
    return classes.join(' ');
  };

  return (
    <div className={`${getGridClasses()} ${className}`}>
      {children}
    </div>
  );
};

interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
}

const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  rounded = 'lg',
  hover = false,
}) => {
  const getPaddingClass = () => {
    switch (padding) {
      case 'sm': return 'p-3 sm:p-4';
      case 'md': return 'p-4 sm:p-6';
      case 'lg': return 'p-6 sm:p-8';
      default: return 'p-4 sm:p-6';
    }
  };

  const getShadowClass = () => {
    switch (shadow) {
      case 'sm': return 'shadow-sm';
      case 'md': return 'shadow-md';
      case 'lg': return 'shadow-lg';
      case 'xl': return 'shadow-xl';
      default: return 'shadow-md';
    }
  };

  const getRoundedClass = () => {
    switch (rounded) {
      case 'sm': return 'rounded-sm';
      case 'md': return 'rounded-md';
      case 'lg': return 'rounded-lg';
      case 'xl': return 'rounded-xl';
      default: return 'rounded-lg';
    }
  };

  const hoverClass = hover ? 'hover:shadow-lg transition-shadow duration-200' : '';

  return (
    <div className={`bg-white ${getPaddingClass()} ${getShadowClass()} ${getRoundedClass()} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
};

interface ResponsiveTableProps {
  headers: string[];
  data: any[];
  renderRow: (item: any, index: number) => React.ReactNode;
  className?: string;
  striped?: boolean;
  hover?: boolean;
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  headers,
  data,
  renderRow,
  className = '',
  striped = true,
  hover = true,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-3 py-3 sm:px-6 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={`bg-white divide-y divide-gray-200 ${striped ? 'divide-y divide-gray-200' : ''}`}>
          {data.map((item, index) => (
            <tr
              key={index}
              className={`
                ${striped && index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                ${hover ? 'hover:bg-gray-100' : ''}
                transition-colors duration-150
              `}
            >
              {renderRow(item, index)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface ResponsiveStatsProps {
  stats: Array<{
    title: string;
    value: string | number;
    change?: {
      value: number;
      type: 'increase' | 'decrease';
    };
    icon?: React.ReactNode;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  }>;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
}

const ResponsiveStats: React.FC<ResponsiveStatsProps> = ({
  stats,
  cols = { default: 1, sm: 2, md: 2, lg: 4 },
}) => {
  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500 text-blue-600',
      green: 'bg-green-500 text-green-600',
      yellow: 'bg-yellow-500 text-yellow-600',
      red: 'bg-red-500 text-red-600',
      purple: 'bg-purple-500 text-purple-600',
      indigo: 'bg-indigo-500 text-indigo-600',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <ResponsiveGrid cols={cols}>
      {stats.map((stat, index) => (
        <ResponsiveCard key={index} hover>
          <div className="flex items-center">
            {stat.icon && (
              <div className={`flex-shrink-0 p-3 rounded-lg bg-opacity-10 ${getColorClasses(stat.color || 'blue').split(' ')[1]}`}>
                <div className={`${getColorClasses(stat.color || 'blue').split(' ')[1]}`}>
                  {stat.icon}
                </div>
              </div>
            )}
            <div className={`${stat.icon ? 'mr-4' : ''} flex-1`}>
              <p className="text-sm font-medium text-gray-600 truncate">{stat.title}</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                {stat.change && (
                  <p className={`mr-2 text-sm font-medium ${
                    stat.change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change.type === 'increase' ? '+' : '-'}{Math.abs(stat.change.value)}%
                  </p>
                )}
              </div>
            </div>
          </div>
        </ResponsiveCard>
      ))}
    </ResponsiveGrid>
  );
};

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}) => {
  if (!isOpen) return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'max-w-sm';
      case 'md': return 'max-w-md';
      case 'lg': return 'max-w-lg sm:max-w-xl';
      case 'xl': return 'max-w-xl sm:max-w-2xl';
      case 'full': return 'max-w-full mx-4';
      default: return 'max-w-md';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        
        <div className={`inline-block w-full ${getSizeClasses()} p-6 my-8 overflow-hidden text-right align-middle transition-all transform bg-white shadow-xl rounded-lg`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="sr-only">إغلاق</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="mt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ResponsiveButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  className = '',
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-transparent';
      case 'secondary':
        return 'bg-gray-200 hover:bg-gray-300 text-gray-900 border-gray-300';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white border-transparent';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white border-transparent';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white border-transparent';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white border-transparent';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'md':
        return 'px-4 py-2 text-sm sm:text-base';
      case 'lg':
        return 'px-6 py-3 text-base sm:text-lg';
      default:
        return 'px-4 py-2 text-sm sm:text-base';
    }
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        border rounded-md font-medium
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        transition-colors duration-200
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${widthClass}
        ${disabledClass}
        ${className}
      `}
    >
      {loading && (
        <svg className="w-4 h-4 ml-2 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};

export {
  ResponsiveGrid,
  ResponsiveCard,
  ResponsiveTable,
  ResponsiveStats,
  ResponsiveModal,
  ResponsiveButton,
};
