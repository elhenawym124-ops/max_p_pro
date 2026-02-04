import React, { useState, useEffect } from 'react';
import { Menu, X, Bell, User, Search, Settings } from 'lucide-react';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  title = 'لوحة التحكم',
  showSearch = true,
  showNotifications = true,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const navigationItems = [
    { name: 'لوحة التحكم', href: '/dashboard', icon: '📊' },
    { name: 'المحادثات', href: '/conversations', icon: '💬' },
    { name: 'العملاء', href: '/customers', icon: '👥' },
    { name: 'المنتجات', href: '/products', icon: '🛍️' },
    { name: 'الطلبات', href: '/orders', icon: '📦' },
    { name: 'التقارير', href: '/reports', icon: '📈' },
    { name: 'نظام RAG', href: '/admin/rag', icon: '🤖' },
    { name: 'الأسئلة الشائعة', href: '/admin/faqs', icon: '❓' },
    { name: 'السياسات', href: '/admin/policies', icon: '📋' },
    { name: 'الإعدادات', href: '/settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3 space-x-reverse">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            {showNotifications && (
              <button className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 relative">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            )}
            <button className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
              <User size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        {showSearch && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="البحث..."
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200">
          <div className="flex flex-col flex-1 min-h-0">
            {/* Logo */}
            <div className="flex items-center h-16 px-6 bg-blue-600">
              <h1 className="text-xl font-bold text-white">منصة التواصل</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigationItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 group"
                >
                  <span className="ml-3 text-lg">{item.icon}</span>
                  {item.name}
                </a>
              ))}
            </nav>

            {/* User Profile */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                </div>
                <div className="mr-3">
                  <p className="text-sm font-medium text-gray-700">أحمد محمد</p>
                  <p className="text-xs text-gray-500">مدير النظام</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative flex flex-col w-64 h-full bg-white shadow-xl">
              {/* Logo */}
              <div className="flex items-center h-16 px-6 bg-blue-600">
                <h1 className="text-xl font-bold text-white">منصة التواصل</h1>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                {navigationItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="ml-3 text-lg">{item.icon}</span>
                    {item.name}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 lg:mr-64">
          {/* Desktop Header */}
          <header className="hidden lg:flex lg:items-center lg:justify-between lg:px-6 lg:py-4 lg:bg-white lg:border-b lg:border-gray-200">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>
            
            <div className="flex items-center space-x-4 space-x-reverse">
              {showSearch && (
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="البحث..."
                    className="w-80 pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
              
              {showNotifications && (
                <button className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 relative">
                  <Bell size={20} />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
              )}
              
              <button className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                <Settings size={20} />
              </button>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">أحمد محمد</span>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResponsiveLayout;
