import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight,
    ChevronDown,
    Globe,
    Lock
} from 'lucide-react';
import { projectStructure, ProjectNode, ProjectNodeStatus } from './projectMapData';
import { useAuth } from '../../hooks/useAuthSimple';

// --- Badges ---
const StatusBadge = ({ status }: { status?: ProjectNodeStatus | undefined }) => {
    if (!status || status === 'stable') return null;

    const styles = {
        beta: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
        new: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
        maintenance: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
        stable: ''
    };

    const labels = {
        beta: 'تجريبي (Beta)',
        new: 'جديد (New)',
        maintenance: 'صيانة',
        stable: ''
    };

    return (
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${styles[status]} font-medium`}>
            {labels[status]}
        </span>
    );
};

// --- Vision Card ---
const VisionCard = () => (
    <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white shadow-xl">
        <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm">
                <Globe className="w-12 h-12 text-white" />
            </div>
            <div>
                <h2 className="text-2xl font-bold mb-2">منظومة الأعمال الذكية المتكاملة (All-in-One AI ERP)</h2>
                <p className="text-blue-100 leading-relaxed text-lg max-w-3xl">
                    هذا المشروع ليس مجرد متجر إلكتروني، بل هو <strong>نظام تشغيل تجاري متكامل</strong> يهدف لتقليل التكاليف التشغيلية بنسبة 40% وزيادة المبيعات بنسبة 30% من خلال أتمتة المهام الروتينية باستخدام الذكاء الاصطناعي، وربط جميع أقسام الشركة (HR, Operations, Marketing) في لوحة تحكم مركزية واحدة.
                </p>
                <div className="mt-4 flex gap-4 text-sm font-medium">
                    <span className="px-3 py-1 bg-white/20 rounded-full">🌱 نمو مستدام</span>
                    <span className="px-3 py-1 bg-white/20 rounded-full">🤖 أتمتة ذكية</span>
                    <span className="px-3 py-1 bg-white/20 rounded-full">📊 قرارات مبنية على البيانات</span>
                </div>
            </div>
        </div>
    </div>
);

// --- Node Card Component ---
const NodeCard = ({ node, isExpanded, onToggle, level = 0, isLocked = false }: { node: ProjectNode, isExpanded: boolean, onToggle: (id: string) => void, level?: number, isLocked?: boolean }) => {
    return (
        <div className={`relative ${isLocked ? 'opacity-70 grayscale' : ''}`}>
            <motion.div
                layout
                onClick={() => !isLocked && node.children && onToggle(node.id)}
                className={`
          relative z-10 p-4 mb-2 rounded-xl cursor-pointer border
          ${level === 0 ? 'bg-white dark:bg-slate-800 shadow-md border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 ml-8'}
          ${!isLocked && 'hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800'} transition-all duration-200
        `}
            >
                <div className="flex items-start gap-4">
                    <div className={`flex flex-shrink-0 items-center justify-center w-12 h-12 rounded-lg text-white mt-1 ${node.color || 'bg-slate-400'}`}>
                        {isLocked ? <Lock className="w-5 h-5" /> : node.icon}
                    </div>

                    <div className="flex-grow text-right">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                {node.title}
                            </h3>
                            <StatusBadge status={node.status} />
                        </div>

                        <div className="mt-1">
                            <p className="text-sm text-slate-500 dark:text-slate-400">{node.description}</p>
                            {/* ROI / Business Value Highlight */}
                            {node.businessValue && (
                                <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded inline-block">
                                    💡 الفائدة: {node.businessValue}
                                </p>
                            )}
                        </div>

                        {node.children && !isLocked && (
                            <div className="flex justify-end mt-2">
                                <span className="text-slate-300 hover:text-slate-500 transition-colors">
                                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {isExpanded && node.children && !isLocked && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden relative"
                    >
                        {/* Connector Line */}
                        <div className="absolute top-0 right-8 bottom-4 w-px bg-slate-300 dark:bg-slate-700" style={{ right: '2rem' }} />

                        <div className="pr-4 space-y-2 pt-2">
                            {node.children.map((child: any) => (
                                <div key={child.id} className="relative pr-10">
                                    {/* Horizontal Connector */}
                                    <div className="absolute top-8 -right-6 w-10 h-px bg-slate-300 dark:bg-slate-700" />

                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {child.icon}
                                            </div>
                                            <div className="text-right flex-grow">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-slate-900 dark:text-white">{child.title}</h4>
                                                    <StatusBadge status={child.status} />
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{child.description}</p>

                                                {/* Child ROI */}
                                                {child.businessValue && (
                                                    <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                        💎 {child.businessValue}
                                                    </p>
                                                )}

                                                {child.details && (
                                                    <div className="mt-2 flex flex-wrap gap-2 justify-end">
                                                        {child.details.map((detail: string) => (
                                                            <span key={detail} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] rounded-full font-mono dir-ltr border border-blue-100 dark:border-blue-800">
                                                                {detail}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Main Component ---
const ProjectMap = () => {
    const { user } = useAuth(); // Hook to get current user role
    const [expandedNodes, setExpandedNodes] = useState<string[]>(['storefront', 'dashboard']);

    const toggleNode = (id: string) => {
        setExpandedNodes(prev =>
            prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
        );
    };

    // Permission Check Logic
    const hasPermission = (node: ProjectNode) => {
        if (!node.requiredRole) return true; // No specific role required
        if (!user) return false; // Must be logged in
        // Super Admin sees everything
        if (user.role === 'SUPER_ADMIN') return true;
        return node.requiredRole.includes(user.role);
    };

    return (
        <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
            <div className="w-full">
                <div className="mb-8 text-center sm:text-right">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 justify-center sm:justify-start">
                        <Globe className="w-8 h-8 text-blue-600" />
                        خريطة المشروع (Project Mind Map) V2.1
                    </h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 text-lg">
                        دليل شامل وهيكلي للنظام، محدث تلقائياً مع حالة السيرفرات.
                    </p>
                    <div className="mt-4 flex gap-3 text-sm text-slate-500 justify-center sm:justify-start">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> مستقر</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> تجريبي (Beta)</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> جديد</span>
                    </div>
                </div>

                <VisionCard />

                <div className="space-y-4">
                    {projectStructure.map((section) => {
                        const canAccess = hasPermission(section);

                        // If user doesn't have permission, we can either hide it or show it locked.
                        // Im choosing to show it locked for "Discovery" purposes, but collapsed.

                        return (
                            <NodeCard
                                key={section.id}
                                node={section}
                                isExpanded={canAccess && expandedNodes.includes(section.id)}
                                onToggle={toggleNode}
                                isLocked={!canAccess}
                            />
                        );
                    })}
                </div>

                <div className="mt-12 p-6 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
                    <p>تم التحديث: {new Date().toLocaleDateString('ar-EG')}</p>
                </div>
            </div>
        </div>
    );
};

export default ProjectMap;

