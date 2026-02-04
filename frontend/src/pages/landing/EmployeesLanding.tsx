import { motion } from 'framer-motion';
import {
    Users,
    Search,
    FileText,
    CheckCircle2,
    Smartphone,
    ArrowLeft,
    Clock,
    LayoutDashboard,
    Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';

const EmployeesLanding = () => {
    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans" dir="rtl">
            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white">
                                <Users size={24} />
                            </div>
                            <span className="text-xl font-bold text-gray-900">HR System</span>
                        </div>
                        <Link
                            to="/auth/register"
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-full font-medium transition-all"
                        >
                            ابدأ الآن
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-primary-50 to-white overflow-hidden">
                <div className="max-w-7xl mx-auto text-center relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
                            إدارة موظفينك بقت أسهل.. <br />
                            <span className="text-primary-600">كل بيانات فريقك قدام عينك بضغطة زر.</span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                            نظام ملفات رقمي ذكي، بيوفر وقتك، بيحفظ مجهودك، وبيخليك تركز في اللي يهم البيزنس بتاعك بجد.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link
                                to="/auth/register"
                                className="bg-primary-600 hover:bg-primary-700 text-white text-lg px-8 py-4 rounded-2xl font-bold shadow-lg shadow-primary-200 transition-all flex items-center justify-center gap-2"
                            >
                                جرب النظام مجاناً الآن
                                <ArrowLeft size={20} />
                            </Link>
                            <button className="bg-white border-2 border-gray-200 hover:border-primary-600 text-gray-700 px-8 py-4 rounded-2xl font-bold transition-all">
                                اطلب عرض تجريبي
                            </button>
                        </div>
                    </motion.div>

                    {/* Floating UI Elements Mockup */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="mt-16 mx-auto max-w-5xl relative"
                    >
                        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 md:p-8 overflow-hidden transform -rotate-1">
                            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4 mb-6 border border-gray-100">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Users size={20} />
                                </div>
                                <div className="text-right flex-1">
                                    <div className="h-2 w-24 bg-gray-200 rounded mb-2"></div>
                                    <div className="h-2 w-40 bg-gray-100 rounded"></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-32 bg-gray-50 rounded-xl animate-pulse"></div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Problem Section */}
            <section className="py-20 px-4 bg-white border-y border-gray-50">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-12">لسه تايه بين شيتات الإكسيل وملفات الورق؟</h2>
                    <div className="grid md:grid-cols-2 gap-8 text-right">
                        <div className="p-8 bg-error-50 rounded-3xl border border-error-100">
                            <h3 className="text-xl font-bold text-error-700 mb-4 flex items-center gap-2">
                                <span className="text-2xl">❌</span> الطريقة القديمة
                            </h3>
                            <ul className="space-y-4 text-gray-700">
                                <li>• ملفات ورقية بتضيع وتتلف بسهولة.</li>
                                <li>• شيتات إكسيل معقدة ودايماً فيها غلطات.</li>
                                <li>• بتاخد ساعات عشان توصل لمعلومة عن موظف.</li>
                                <li>• صعوبة متابعة الأجازات وبداية العقود.</li>
                            </ul>
                        </div>
                        <div className="p-8 bg-success-50 rounded-3xl border border-success-100">
                            <h3 className="text-xl font-bold text-success-700 mb-4 flex items-center gap-2">
                                <span className="text-2xl">✅</span> مع نظامنا الذكي
                            </h3>
                            <ul className="space-y-4 text-gray-700">
                                <li>• بروفايل رقمي شامل لكل موظف بمكانه.</li>
                                <li>• بحث ذكي بيطلع المعلومة في ثواني.</li>
                                <li>• تنبيهات ذكية لكل المواعيد المهمة.</li>
                                <li>• توفير 70% من وقت المجهود الإداري.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">كل اللي محتاجه في شاشة واحدة</h2>
                        <p className="text-gray-600">صممنا قسم الموظفين ليكون الأداة الأفضل لمديري الـ HR وأصحاب الشركات</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            {
                                icon: <LayoutDashboard className="text-primary-600" />,
                                title: "ملف موظف شامل",
                                desc: "كل بيانات الموظف (شخصية، عقود، مرتبات) في مكان واحد منظم."
                            },
                            {
                                icon: <Search className="text-primary-600" />,
                                title: "بحث في لحظة",
                                desc: "مش محتاج تفتكر الاسم بالكامل.. اكتب أي حرف وهتلاقي الملف فوراً."
                            },
                            {
                                icon: <Clock className="text-primary-600" />,
                                title: "تحديثات لحظية",
                                desc: "أي تغيير بيسمع في السيستم كله في نفس اللحظة، مفيش حاجة هتوه منك."
                            },
                            {
                                icon: <FileText className="text-primary-600" />,
                                title: "أرشيف وثائق ذكي",
                                desc: "ارفع صور البطايق والعقود، واستغنى عن الورق اللي بياخد مكان."
                            }
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -10 }}
                                className="p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:shadow-xl hover:bg-white transition-all text-right"
                            >
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 px-4 bg-primary-600 text-white overflow-hidden relative">
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-4xl font-bold mb-8">ليه أصحاب الشركات بيختاروا نظامنا؟</h2>
                            <div className="space-y-6">
                                {[
                                    "توفير 70% من وقت الإدارة اليومي.",
                                    "وداعاً للأخطاء البشرية وفقدان البيانات.",
                                    "صورة احترافية لشركتك قدام الموظفين.",
                                    "أمان كامل وتشفير لكل الملفات والبيانات."
                                ].map((text, i) => (
                                    <div key={i} className="flex items-center gap-3 text-lg font-medium">
                                        <CheckCircle2 className="text-primary-200 shrink-0" />
                                        <span>{text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-primary-500 rounded-3xl p-8 border border-primary-400 rotate-2">
                            <div className="flex flex-col gap-4">
                                <div className="h-4 w-3/4 bg-primary-400 rounded"></div>
                                <div className="h-4 w-1/2 bg-primary-400 rounded"></div>
                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    <div className="h-20 bg-primary-400 rounded-xl"></div>
                                    <div className="h-20 bg-primary-400 rounded-xl"></div>
                                    <div className="h-20 bg-primary-400 rounded-xl"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500 rounded-full blur-3xl opacity-20 translate-x-1/2 -translate-y-1/2"></div>
            </section>

            {/* Trust Badges */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-12 grayscale opacity-60">
                    <div className="flex items-center gap-2 font-bold text-xl uppercase tracking-widest"><Shield size={24} /> Secure</div>
                    <div className="flex items-center gap-2 font-bold text-xl uppercase tracking-widest"><Smartphone size={24} /> Mobile Ready</div>
                    <div className="flex items-center gap-2 font-bold text-xl uppercase tracking-widest"><CheckCircle2 size={24} /> Verified</div>
                </div>
            </section>

            {/* CTA Footer */}
            <section className="py-24 px-4 text-center">
                <div className="max-w-3xl mx-auto bg-gray-900 text-white rounded-[4rem] p-12 md:p-20 relative overflow-hidden">
                    <h2 className="text-3xl md:text-5xl font-bold mb-8 relative z-10">جاهز تحول إدارة موظفينك لبروفيشينال؟</h2>
                    <p className="text-gray-400 mb-10 text-lg relative z-10">ابدأ النهاردة ووفر وقتك ومجهودك للنمو بالبيزنس بتاعك.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
                        <Link
                            to="/auth/register"
                            className="bg-primary-600 hover:bg-primary-700 text-white text-xl px-12 py-5 rounded-2xl font-bold transition-all shadow-xl shadow-primary-900/40"
                        >
                            سجل الآن مجاناً
                        </Link>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary-600 to-blue-400"></div>
                </div>
            </section>

            {/* Simple Footer */}
            <footer className="py-8 border-t border-gray-100 text-center text-gray-500">
                <p>© {new Date().getFullYear()} HR System. جميع الحقوق محفوظة.</p>
            </footer>
        </div>
    );
};

export default EmployeesLanding;
