
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { tokenManager } from '../../utils/tokenManager';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/config';
import { buildStoreUrl } from '../../utils/storeUrl';
import { useAuth } from '../../hooks/useAuthSimple';
import NotificationDropdown from '../notifications/NotificationDropdown';
import LanguageSwitcher from '../common/LanguageSwitcher';
import CompanySwitcher from '../common/CompanySwitcher';
import ThemeToggle from '../ui/theme-toggle';
import { MessageCircle } from 'lucide-react';
import {
  UserCircleIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  ArrowLeftIcon,
  Cog6ToothIcon,
  BellIcon,
  ChevronDownIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  CogIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  CalendarIcon,
  CheckCircleIcon,
  SpeakerWaveIcon,
  TagIcon,
  ArchiveBoxIcon,
  TicketIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  CreditCardIcon,
  PresentationChartLineIcon,
  WrenchScrewdriverIcon,
  BellAlertIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  UserGroupIcon,
  KeyIcon,
  DocumentCheckIcon,
  ShieldExclamationIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  MegaphoneIcon,
  QuestionMarkCircleIcon,
  RocketLaunchIcon,
  StarIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  ComputerDesktopIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';
import { getSidebarConfig } from '../../config/sidebar';
import SidebarLayoutFactory from './sidebar/SidebarLayoutFactory';
import { SidebarLayoutType } from '../../types/layout';

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, fullWidth = false }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isI18nReady, setIsI18nReady] = useState(i18n.isInitialized);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('sidebar-collapsed-sections');
    return saved ? JSON.parse(saved) : {};
  });

  // Calculate if padding should be removed
  const shouldRemovePadding = fullWidth || location.pathname.startsWith('/profile');

  // التحقق من جاهزية i18n
  useEffect(() => {
    if (i18n.isInitialized) {
      setIsI18nReady(true);
      return;
    }

    const checkI18n = setInterval(() => {
      if (i18n.isInitialized) {
        setIsI18nReady(true);
        clearInterval(checkI18n);
      }
    }, 50);

    return () => clearInterval(checkI18n);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newState = { ...prev, [sectionId]: !prev[sectionId] };
      localStorage.setItem('sidebar-collapsed-sections', JSON.stringify(newState));
      return newState;
    });
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    localStorage.setItem('sidebar-collapsed', (!isSidebarCollapsed).toString());
  };

  // استخدام القائمة الجانبية من ملف sidebar.ts المخصص بدلاً من التكرار
  const menuSections = useMemo(() => {
    if (!isI18nReady) {
      return [];
    }
    const config = getSidebarConfig(t, user);

    // تحويل الأيقونات من Component classes إلى JSX elements
    return config.map(section => ({
      ...section,
      icon: React.isValidElement(section.icon)
        ? section.icon
        : React.createElement(section.icon as any, { className: 'h-5 w-5' }),
      items: section.items.map(item => ({
        ...item,
        icon: React.isValidElement(item.icon)
          ? item.icon
          : React.createElement(item.icon as any, { className: 'h-5 w-5' })
      }))
    }));
  }, [user, t, isI18nReady]);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMobileToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // فلترة القوائم حسب البحث
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return menuSections;

    const query = searchQuery.toLowerCase();
    return menuSections.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.label.toLowerCase().includes(query) ||
        section.title.toLowerCase().includes(query)
      )
    })).filter(section => section.items.length > 0);
  }, [menuSections, searchQuery]);

  // Helper function for navigation links
  const NavLink: React.FC<{
    to: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    external?: boolean;
    badge?: string;
  }> = ({ to, icon, children, external, badge }) => {
    const isActive = !external && location.pathname === to;

    // للينكات الخارجية (المتجر العام)
    if (external) {
      // ✅ FIX: استخدم slug فقط (ليس companyId) لبناء subdomain URL
      // حفظ companyId في localStorage بدلاً من إضافته للـ URL
      const slug = user?.company?.slug;
      const companyId = user?.companyId;

      // حفظ companyId في localStorage إذا كان موجوداً
      if (companyId) {
        localStorage.setItem('storefront_companyId', companyId);
      }

      let shopUrl: string;
      // ✅ Always include companyId in the URL for correct company identification
      // Build URL with companyId query parameter
      const basePath = to.includes('?') ? to : to;
      if (companyId) {
        shopUrl = basePath.includes('?')
          ? `${basePath}&companyId=${companyId}`
          : `${basePath}?companyId=${companyId}`;
      } else {
        shopUrl = basePath;
      }

      return (
        <a
          href={shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
          title={isSidebarCollapsed ? children as string : undefined}
        >
          <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors mr-3">
            {icon}
          </span>
          {!isSidebarCollapsed && (
            <span className="text-sm font-medium truncate flex items-center gap-2">
              {children}
              {badge && (
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                  {badge}
                </span>
              )}
            </span>
          )}
        </a>
      );
    }

    return (
      <Link
        to={to}
        className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          } `}
        title={isSidebarCollapsed ? children as string : undefined}
      >
        <span className={`${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'} transition-colors ${isSidebarCollapsed ? 'mr-0' : 'mr-3'} `}>
          {icon}
        </span>
        {!isSidebarCollapsed && (
          <span className="text-sm font-medium truncate">{children}</span>
        )}
      </Link>
    );
  };


  const currentLayout = (user?.company?.sidebarLayout as SidebarLayoutType) || 'three-tier';
  const isHorizontalLayout = currentLayout === 'horizontal';

  return (
    <div className="h-screen w-full bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      {isHorizontalLayout ? (
        // Horizontal Navigation Layout - Nav on top, content below
        <div className="flex flex-col h-screen">
          {/* Horizontal Nav */}
          <SidebarLayoutFactory
            layout={currentLayout}
            isCollapsed={isSidebarCollapsed}
            toggleSidebar={toggleSidebar}
            sections={filteredSections}
            collapsedSections={collapsedSections}
            toggleSection={toggleSection}
            currentPath={location.pathname}
            t={t}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* Main Content */}
          <div className="flex-1 w-full flex flex-col h-full overflow-hidden transition-all duration-300">
            {/* Header */}
            <header className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 z-10">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  {/* تنبيه دخول المدير العام */}
                  {/* ✅ Super Admin Impersonation Bar - Working Implementation */}
                  {localStorage.getItem('superAuth') && (
                    <div className="flex items-center bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mr-4">
                      <svg className="h-5 w-5 text-orange-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm font-medium text-orange-700 ml-2">
                        {t('sidebar.superAdminLogin') || 'أنت تتصفح كمدير شركة'}
                      </span>
                      <button
                        onClick={() => {
                          // Restore Super Admin Context
                          const superAuth = localStorage.getItem('superAuth');
                          const superUser = localStorage.getItem('superUser');
                          if (superAuth && superUser) {
                            tokenManager.setAccessToken(superAuth);
                            localStorage.setItem('user', superUser);

                            // Clear temp storage
                            localStorage.removeItem('superAuth');
                            localStorage.removeItem('superUser');

                            // Redirect
                            window.location.href = '/super-admin/companies';
                          }
                        }}
                        className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded text-sm mr-3 transition-colors cursor-pointer font-bold"
                      >
                        {t('sidebar.backToCompanies') || 'العودة للسوبر أدمن'}
                      </button>
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('sidebar.welcome')}
                  </h2>
                  <div className="flex items-center space-x-4 space-x-reverse">
                    {/* Company Switcher in Header */}
                    {user?.hasMultipleCompanies && (
                      <div className="w-56 ml-2 hidden md:block">
                        <CompanySwitcher />
                      </div>
                    )}

                    <ThemeToggle />
                    <LanguageSwitcher />

                    {/* Support Button */}
                    <button
                      onClick={() => window.open('/support', '_blank')}
                      className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="مركز الدعم"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </button>

                    {/* Notifications */}
                    <NotificationDropdown />

                    {/* Profile Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className="flex items-center space-x-2 space-x-reverse text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 p-2"
                      >
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-700">
                            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div className="hidden md:block text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user?.firstName} {user?.lastName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</div>
                        </div>
                        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                      </button>

                      {/* Profile Dropdown Menu */}
                      {isProfileMenuOpen && (
                        <>
                          {/* Overlay */}
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsProfileMenuOpen(false)}
                          />

                          {/* Dropdown Menu */}
                          <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                            <div className="py-1">
                              <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                                <div className="font-medium">{user?.firstName} {user?.lastName}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</div>
                                <div className="text-xs text-indigo-600 dark:text-indigo-400">{user?.company?.name}</div>
                              </div>

                              <Link
                                to="/profile"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setIsProfileMenuOpen(false)}
                              >
                                <UserCircleIcon className="h-4 w-4 ml-2" />
                                {t('sidebar.profile')}
                              </Link>

                              <Link
                                to="/settings"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setIsProfileMenuOpen(false)}
                              >
                                <Cog6ToothIcon className="h-4 w-4 ml-2" />
                                {t('sidebar.settings')}
                              </Link>

                              {/* زر العودة لمدير النظام */}
                              {(user as any)?.loginType === 'super_admin_impersonation' && (
                                <Link
                                  to="/super-admin/companies"
                                  className="flex items-center px-4 py-2 text-sm text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-t border-gray-100 dark:border-gray-700"
                                  onClick={() => setIsProfileMenuOpen(false)}
                                >
                                  <ArrowLeftIcon className="h-4 w-4 ml-2" />
                                  {t('sidebar.backToCompanies')}
                                </Link>
                              )}

                              <div className="border-t border-gray-100 dark:border-gray-700">
                                <button
                                  onClick={handleLogout}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <ArrowRightOnRectangleIcon className="h-4 w-4 ml-2" />
                                  {t('sidebar.logout')}
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <main className={`flex-1 overflow-y-auto ${shouldRemovePadding ? 'p-0' : 'p-6'} `}>
              {children}
            </main>
          </div>
        </div>
      ) : (
        // Traditional Sidebar Layout - Sidebar on the side
        <div className="flex w-full h-screen">
          {/* Sidebar Factory */}
          {/* Sidebar Factory */}
          <div className="hidden lg:block h-full">
            <SidebarLayoutFactory
              layout={currentLayout}
              isCollapsed={isSidebarCollapsed}
              toggleSidebar={toggleSidebar}
              sections={filteredSections}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              currentPath={location.pathname}
              t={t}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>

          {/* Mobile Sidebar Overlay */}
          {isMobile && isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden font-sans" style={{ direction: i18n.dir() }}>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* Drawer */}
              <div className={`fixed inset-y-0 ${i18n.dir() === 'rtl' ? 'right-0' : 'left-0'} w-auto max-w-[85vw] bg-transparent shadow-2xl transform transition-transform duration-300 ease-in-out`}>
                <div className="h-full bg-white dark:bg-gray-800">
                  <SidebarLayoutFactory
                    layout={currentLayout}
                    isCollapsed={false} // Always expanded on mobile
                    toggleSidebar={() => setIsMobileMenuOpen(false)} // Close on toggle
                    sections={filteredSections}
                    collapsedSections={collapsedSections}
                    toggleSection={toggleSection}
                    currentPath={location.pathname}
                    t={t}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 w-full flex flex-col h-full overflow-hidden transition-all duration-300">
            {/* Header */}
            <header className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 z-10">
              <div className="px-4 py-4 lg:px-6">
                <div className="flex items-center justify-between">
                  {/* Mobile Toggle Button */}
                  <div className="lg:hidden flex items-center">
                    <button
                      onClick={handleMobileToggle}
                      className="p-2 -mr-2 ml-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    >
                      <span className="sr-only">Open sidebar</span>
                      <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  {/* تنبيه دخول المدير العام */}
                  {localStorage.getItem('superAuth') && (
                    <div className="flex items-center bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mr-4">
                      <svg className="h-5 w-5 text-orange-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm font-medium text-orange-700 ml-2">
                        {t('sidebar.superAdminLogin') || 'أنت تتصفح كمدير شركة'}
                      </span>
                      <button
                        onClick={() => {
                          const superAuth = localStorage.getItem('superAuth');
                          const superUser = localStorage.getItem('superUser');
                          if (superAuth && superUser) {
                            tokenManager.setAccessToken(superAuth);
                            localStorage.setItem('user', superUser);
                            localStorage.removeItem('superAuth');
                            localStorage.removeItem('superUser');
                            window.location.href = '/super-admin/companies';
                          }
                        }}
                        className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded text-sm mr-3 transition-colors cursor-pointer font-bold"
                      >
                        {t('sidebar.backToCompanies') || 'العودة للسوبر أدمن'}
                      </button>
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('sidebar.welcome')}
                  </h2>
                  <div className="flex items-center space-x-4 space-x-reverse">
                    {/* Company Switcher in Header */}
                    {user?.hasMultipleCompanies && (
                      <div className="w-56 ml-2 hidden md:block">
                        <CompanySwitcher />
                      </div>
                    )}

                    <ThemeToggle />
                    <LanguageSwitcher />

                    {/* Support Button */}
                    <button
                      onClick={() => window.open('/support', '_blank')}
                      className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="مركز الدعم"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </button>

                    {/* Notifications */}
                    <NotificationDropdown />

                    {/* Profile Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className="flex items-center space-x-2 space-x-reverse text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 p-2"
                      >
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-700">
                            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div className="hidden md:block text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user?.firstName} {user?.lastName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</div>
                        </div>
                        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                      </button>

                      {/* Profile Dropdown Menu */}
                      {isProfileMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsProfileMenuOpen(false)}
                          />
                          <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                            <div className="py-1">
                              <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                                <div className="font-medium">{user?.firstName} {user?.lastName}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</div>
                                <div className="text-xs text-indigo-600 dark:text-indigo-400">{user?.company?.name}</div>
                              </div>

                              <Link
                                to="/profile"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setIsProfileMenuOpen(false)}
                              >
                                <UserCircleIcon className="h-4 w-4 ml-2" />
                                {t('sidebar.profile')}
                              </Link>

                              <Link
                                to="/settings"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setIsProfileMenuOpen(false)}
                              >
                                <Cog6ToothIcon className="h-4 w-4 ml-2" />
                                {t('sidebar.settings')}
                              </Link>

                              {(user as any)?.loginType === 'super_admin_impersonation' && (
                                <Link
                                  to="/super-admin/companies"
                                  className="flex items-center px-4 py-2 text-sm text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-t border-gray-100 dark:border-gray-700"
                                  onClick={() => setIsProfileMenuOpen(false)}
                                >
                                  <ArrowLeftIcon className="h-4 w-4 ml-2" />
                                  {t('sidebar.backToCompanies')}
                                </Link>
                              )}

                              <div className="border-t border-gray-100 dark:border-gray-700">
                                <button
                                  onClick={handleLogout}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <ArrowRightOnRectangleIcon className="h-4 w-4 ml-2" />
                                  {t('sidebar.logout')}
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <main className={`flex-1 overflow-y-auto ${shouldRemovePadding ? 'p-0' : 'p-6'} `}>
              {children}
            </main>
          </div>
        </div>
      )}

    </div>
  );
};

export default Layout;
