import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { SidebarSection } from '../../../types/layout';
import { buildStoreUrl } from '../../../utils/storeUrl';
import { useAuth } from '../../../hooks/useAuthSimple';
import { envConfig } from '../../../config/environment';

interface MinimalSidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    sections: SidebarSection[];
    currentPath: string;
    t: (key: string) => string;
}

const MinimalSidebar: React.FC<MinimalSidebarProps> = ({
    sections,
    currentPath,
}) => {
    const { user } = useAuth();
    const [hoveredSection, setHoveredSection] = useState<string | null>(null);

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
            let shopUrl = to;

            if (slug && slug.trim().length > 0) {
                shopUrl = buildStoreUrl(slug, to, customDomain || undefined);
            }

            return (
                <a
                    href={shopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-2 rounded-md transition-all duration-200 group text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <span className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mr-3">
                        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement, {
                            className: "h-4 w-4"
                        })}
                    </span>
                    <span className="text-sm font-medium truncate flex-1">
                        {children}
                    </span>
                </a>
            );
        }

        return (
            <Link
                to={to}
                className={`flex items-center px-3 py-2 rounded-md transition-all duration-200 group ${isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } `}
            >
                <span className={`${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'} mr-3`}>
                    {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement, {
                        className: "h-4 w-4"
                    })}
                </span>
                <span className="text-sm font-medium truncate flex-1">{children}</span>
                {badge && (
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                        {badge}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <div className="flex flex-col w-20 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 py-4 shadow-xl z-30">
            {/* Company Logo */}
            <div className="flex items-center justify-center mb-6">
                {user?.company?.logo ? (
                    <img
                        src={`${envConfig.backendUrl}${user.company.logo}`}
                        alt={user?.company?.name}
                        className="h-12 w-12 rounded-xl object-cover shadow-lg border-2 border-gray-200 dark:border-gray-600"
                        title={user?.company?.name}
                    />
                ) : (
                    <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg" title={user?.company?.name}>
                        {user?.company?.name?.charAt(0) || 'M'}
                    </div>
                )}
            </div>

            {/* Navigation Icons */}
            <div className="flex-1 w-full space-y-2 px-2 overflow-y-auto no-scrollbar">
                {sections.filter(s => !s.hidden).map(section => {
                    const isActive = section.items.some(item => item.to === currentPath);
                    const isHovered = hoveredSection === section.id;

                    return (
                        <div
                            key={section.id}
                            className="relative group"
                            onMouseEnter={() => setHoveredSection(section.id)}
                            onMouseLeave={() => setHoveredSection(null)}
                        >
                            <button
                                className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative ${isActive
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                {React.isValidElement(section.icon) && React.cloneElement(section.icon as React.ReactElement, {
                                    className: `h-6 w-6 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`
                                })}

                                {/* Active Indicator */}
                                {isActive && (
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-l-full" />
                                )}
                            </button>

                            {/* Floating Tooltip/Menu */}
                            {isHovered && (
                                <div className="absolute right-full top-0 mr-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50 animate-in fade-in slide-in-from-right-2 duration-200">
                                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-2">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                                    </div>
                                    <div className="space-y-1">
                                        {section.items.filter(i => !i.hidden).map(item => (
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
                                                {item.children && (
                                                    <div className="mr-8 mt-0.5 space-y-0.5 border-r border-gray-100 dark:border-gray-700/50 pr-1">
                                                        {item.children.filter(c => !c.hidden).map(child => {
                                                            const isChildActive = currentPath === child.to;
                                                            return (
                                                                <Link
                                                                    key={child.to}
                                                                    to={child.to}
                                                                    className={`block px-2 py-1 text-[11px] font-medium rounded transition-all duration-200 ${isChildActive
                                                                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                                        }`}
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
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

        </div>
    );
};

export default MinimalSidebar;
