import React from 'react';
import { Link } from 'react-router-dom';
import {
    Bars3Icon,
    XMarkIcon,
    ChevronRightIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { SidebarSection } from '../../../types/layout';
import { buildStoreUrl } from '../../../utils/storeUrl';
import { useAuth } from '../../../hooks/useAuthSimple';
import { envConfig } from '../../../config/environment';

interface ClassicSidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    sections: SidebarSection[];
    collapsedSections: Record<string, boolean>;
    toggleSection: (id: string) => void;
    currentPath: string;
    t: (key: string) => string;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const ClassicSidebar: React.FC<ClassicSidebarProps> = ({
    isCollapsed,
    toggleSidebar,
    sections,
    collapsedSections,
    toggleSection,
    currentPath,
    t,
    searchQuery,
    setSearchQuery
}) => {
    const { user } = useAuth();

    // Helper for navigation links
    const NavLink: React.FC<{
        to: string;
        icon: React.ReactNode;
        children: React.ReactNode;
        external?: boolean;
        badge?: string;
    }> = ({ to, icon, children, external, badge }) => {
        const isActive = !external && currentPath === to;

        if (external) {
            const slug = user?.company?.slug;
            const customDomain = user?.company?.customDomain;
            console.log('🔍 [ClassicSidebar] slug:', slug, 'customDomain:', customDomain);
            let shopUrl = to;

            if (slug && slug.trim().length > 0) {
                shopUrl = buildStoreUrl(slug, to, customDomain || undefined);
                console.log('🔗 [ClassicSidebar] Generated shopUrl:', shopUrl);
            }

            return (
                <a
                    href={shopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    title={isCollapsed ? children as string : undefined}
                >
                    <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors mr-3">
                        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement, {
                            className: "h-5 w-5"
                        })}
                    </span>
                    {!isCollapsed && (
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
                title={isCollapsed ? children as string : undefined}
            >
                <span className={`${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'} transition-colors ${isCollapsed ? 'mr-0' : 'mr-3'} `}>
                    {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement, {
                        className: "h-5 w-5"
                    })}
                </span>
                {!isCollapsed && (
                    <span className="text-sm font-medium truncate">{children}</span>
                )}
            </Link>
        );
    };

    return (
        <div
            className={`${isCollapsed ? 'w-20' : 'w-72'
                } h-full bg-white dark:bg-gray-800 shadow-xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out border-l border-gray-200 dark:border-gray-700`}
        >
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    {!isCollapsed && (
                        <div className="flex items-center flex-1">
                            {/* Company Logo */}
                            {user?.company?.logo ? (
                                <img
                                    src={`${envConfig.backendUrl}${user.company.logo}`}
                                    alt={user?.company?.name}
                                    className="h-12 w-12 rounded-xl object-cover mr-3 shadow-lg border-2 border-gray-200 dark:border-gray-600"
                                />
                            ) : (
                                <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-3 shadow-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">
                                        {user?.company?.name?.charAt(0) || 'M'}
                                    </span>
                                </div>
                            )}
                            <div>
                                <h1 className="text-lg font-extrabold text-gray-900 dark:text-white leading-tight">
                                    {user?.company?.name || t('sidebar.platformName')}
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('sidebar.platformName')}
                                </p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title={isCollapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
                    >
                        {isCollapsed ? (
                            <Bars3Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        ) : (
                            <XMarkIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        )}
                    </button>
                </div>

                {/* Company Logo for collapsed sidebar */}
                {isCollapsed && (
                    <div className="mt-4 flex justify-center">
                        {user?.company?.logo ? (
                            <img
                                src={`${envConfig.backendUrl}${user.company.logo}`}
                                alt={user?.company?.name}
                                className="h-10 w-10 rounded-xl object-cover shadow-lg border-2 border-gray-200 dark:border-gray-600"
                                title={user?.company?.name}
                            />
                        ) : (
                            <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center" title={user?.company?.name}>
                                <span className="text-white font-bold text-lg">
                                    {user?.company?.name?.charAt(0) || 'M'}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Search Bar */}
            {!isCollapsed && (
                <div className="px-4 mt-2 relative">
                    <MagnifyingGlassIcon className="absolute right-7 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="بحث في القائمة..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-10 pl-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute left-6 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        >
                            <XMarkIcon className="h-3 w-3 text-gray-400" />
                        </button>
                    )}
                </div>
            )}

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {sections.filter(s => !s.hidden).map(section => {
                    const isSectionCollapsed = collapsedSections[section.id];
                    const hasActiveItem = section.items.some(item => currentPath === item.to);

                    return (
                        <div key={section.id} className="mb-4">
                            <button
                                onClick={() => toggleSection(section.id)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group ${hasActiveItem && !isCollapsed
                                    ? 'bg-blue-50 dark:bg-blue-900/20'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                    } `}
                                title={isCollapsed ? section.title : undefined}
                            >
                                <div className="flex items-center">
                                    <span className="text-xl mr-2">
                                        {React.isValidElement(section.icon) && React.cloneElement(section.icon as React.ReactElement, {
                                            className: "h-5 w-5"
                                        })}
                                    </span>
                                    {!isCollapsed && (
                                        <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                            {section.title}
                                        </h3>
                                    )}
                                </div>
                                {!isCollapsed && (
                                    <ChevronRightIcon
                                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isSectionCollapsed ? '' : 'rotate-90'
                                            } `}
                                    />
                                )}
                            </button>
                            {(!isSectionCollapsed || isCollapsed) && (
                                <div className={`mt-1 space-y-1 ${isCollapsed ? 'mt-2' : ''} `}>
                                    {section.items.filter(i => !i.hidden).map((item) => (
                                        <div key={item.to} className="space-y-1">
                                            <NavLink
                                                to={item.to}
                                                icon={item.icon}
                                                external={!!item.external}
                                                {...(item.badge ? { badge: item.badge } : {})}
                                            >
                                                {item.label}
                                            </NavLink>

                                            {/* Sub-items (Children) */}
                                            {!isCollapsed && item.children && (
                                                <div className="mr-9 mt-1 space-y-1 border-r-2 border-gray-100 dark:border-gray-700/50 pr-2">
                                                    {item.children.filter(c => !c.hidden).map((child) => {
                                                        const isChildActive = currentPath === child.to;
                                                        return (
                                                            <Link
                                                                key={child.to}
                                                                to={child.to}
                                                                className={`block px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${isChildActive
                                                                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                                    } `}
                                                            >
                                                                {child.label}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

        </div>
    );
};

export default ClassicSidebar;
