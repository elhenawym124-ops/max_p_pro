import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              سياسة الخصوصية
            </h1>
            
            <div className="prose prose-lg dark:prose-invert max-w-none text-right">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                آخر تحديث: {new Date().toLocaleDateString('ar-SA')}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">1. مقدمة</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                 نحن في تطبيق <strong>m2</strong> والمملوك من قبل <strong>MaxP AI</strong> نقدر خصوصيتك ونلتزم بحماية معلوماتك الشخصية. 
  توضح سياسة الخصوصية هذه كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتك عند استخدامك لمنصتنا.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">2. المعلومات التي نجمعها</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-2">2.1 المعلومات الشخصية</h3>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>الاسم الكامل</li>
                      <li>عنوان البريد الإلكتروني</li>
                      <li>رقم الهاتف</li>
                      <li>معلومات الشركة</li>
                      <li>عنوان الموقع الإلكتروني</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-2">2.2 معلومات الاستخدام</h3>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>سجلات النشاط على المنصة</li>
                      <li>المحادثات والرسائل</li>
                      <li>بيانات العملاء والطلبات</li>
                      <li>إعدادات الحساب والتفضيلات</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-2">2.3 المعلومات التقنية</h3>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>عنوان IP</li>
                      <li>نوع المتصفح والجهاز</li>
                      <li>نظام التشغيل</li>
                      <li>ملفات تعريف الارتباط (Cookies)</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">3. كيفية استخدام المعلومات</h2>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                  <li>تقديم وتحسين خدماتنا</li>
                  <li>إدارة حسابك والتواصل معك</li>
                  <li>معالجة المدفوعات والفواتير</li>
                  <li>تقديم الدعم الفني</li>
                  <li>تحليل الاستخدام وتحسين الأداء</li>
                  <li>الامتثال للمتطلبات القانونية</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">4. مشاركة المعلومات</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  نحن لا نبيع أو نؤجر أو نشارك معلوماتك الشخصية مع أطراف ثالثة، باستثناء الحالات التالية:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                  <li>عند الحصول على موافقتك الصريحة</li>
                  <li>مع مقدمي الخدمات الموثوقين الذين يساعدوننا في تشغيل المنصة</li>
                  <li>عند الامتثال للمتطلبات القانونية</li>
                  <li>لحماية حقوقنا أو سلامة المستخدمين</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">5. أمان المعلومات</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  نتخذ تدابير أمنية صارمة لحماية معلوماتك، بما في ذلك:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                  <li>تشفير البيانات أثناء النقل والتخزين</li>
                  <li>التحكم في الوصول والمصادقة المتعددة العوامل</li>
                  <li>المراقبة المستمرة للأنشطة المشبوهة</li>
                  <li>النسخ الاحتياطي المنتظم للبيانات</li>
                  <li>التحديثات الأمنية المستمرة</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">6. حقوقك</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  لديك الحق في:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                  <li>الوصول إلى معلوماتك الشخصية</li>
                  <li>تصحيح أو تحديث معلوماتك</li>
                  <li>حذف حسابك ومعلوماتك</li>
                  <li>تقييد معالجة معلوماتك</li>
                  <li>نقل بياناتك إلى خدمة أخرى</li>
                  <li>الاعتراض على معالجة معلوماتك</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">7. ملفات تعريف الارتباط</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  نستخدم ملفات تعريف الارتباط لتحسين تجربتك على المنصة. يمكنك التحكم في إعدادات ملفات تعريف الارتباط من خلال متصفحك.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">8. الاحتفاظ بالبيانات</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  نحتفظ بمعلوماتك طالما كان حسابك نشطاً أو حسب الحاجة لتقديم الخدمات. قد نحتفظ ببعض المعلومات لفترة أطول للامتثال للمتطلبات القانونية.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">9. التغييرات على السياسة</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سنقوم بإشعارك بأي تغييرات مهمة عبر البريد الإلكتروني أو من خلال المنصة.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">10. التواصل معنا</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى التواصل معنا:
                </p>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>البريد الإلكتروني:</strong> elhnnawyfromnew@gmail.com<br />
                    <strong>الهاتف:</strong> +201123087745<br />
                    <strong>العنوان:</strong> مصر
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mt-6">
  هذه السياسة تخص تطبيق <strong>m2</strong> التابع لشركة <strong>MaxP AI</strong> والموقع الإلكتروني الرسمي <a href="https://www.maxp-ai.pro" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">https://www.maxp-ai.pro</a>.
</p>

                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

