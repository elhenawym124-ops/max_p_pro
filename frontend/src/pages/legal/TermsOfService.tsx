import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              شروط الاستخدام
            </h1>
            
            <div className="prose prose-lg dark:prose-invert max-w-none text-right">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                آخر تحديث: {new Date().toLocaleDateString('ar-SA')}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">1. قبول الشروط</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  باستخدام منصة MaxP AI، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام المنصة.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">2. وصف الخدمة</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  MaxP AI هي منصة ذكية لإدارة المحادثات والعملاء تستخدم تقنيات الذكاء الاصطناعي لتحسين تجربة خدمة العملاء وإدارة الأعمال.
                </p>
                <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-2">الخدمات المقدمة تشمل:</h3>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                  <li>إدارة المحادثات مع العملاء</li>
                  <li>الردود الآلية الذكية</li>
                  <li>إدارة قاعدة بيانات العملاء</li>
                  <li>تحليلات الأداء والتقارير</li>
                  <li>إدارة الطلبات والمنتجات</li>
                  <li>التكامل مع منصات التواصل الاجتماعي</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">3. التسجيل والحساب</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-2">3.1 متطلبات التسجيل</h3>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>يجب أن تكون 18 عاماً أو أكثر</li>
                      <li>تقديم معلومات صحيحة ومحدثة</li>
                      <li>الحفاظ على سرية بيانات الدخول</li>
                      <li>إشعارنا فوراً بأي استخدام غير مصرح به</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-2">3.2 مسؤولية الحساب</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      أنت مسؤول عن جميع الأنشطة التي تحدث تحت حسابك. يجب عليك الحفاظ على أمان كلمة المرور وعدم مشاركتها مع الآخرين.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">4. الاستخدام المقبول</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">4.1 الاستخدامات المسموحة</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>استخدام المنصة لأغراض تجارية مشروعة</li>
                      <li>إدارة علاقات العملاء بطريقة أخلاقية</li>
                      <li>الامتثال لجميع القوانين المحلية والدولية</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">4.2 الاستخدامات المحظورة</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>إرسال رسائل غير مرغوب فيها (سبام)</li>
                      <li>انتهاك حقوق الملكية الفكرية</li>
                      <li>نشر محتوى مسيء أو غير قانوني</li>
                      <li>محاولة اختراق أو إلحاق الضرر بالمنصة</li>
                      <li>استخدام المنصة لأنشطة احتيالية</li>
                      <li>انتهاك خصوصية الآخرين</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. الدفع والاشتراكات</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">5.1 الرسوم</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      تختلف رسوم الاشتراك حسب الخطة المختارة. جميع الرسوم مستحقة الدفع مقدماً وغير قابلة للاسترداد إلا في حالات محددة.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">5.2 التجديد التلقائي</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      سيتم تجديد اشتراكك تلقائياً ما لم تقم بإلغائه قبل انتهاء فترة الفوترة الحالية.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">5.3 الإلغاء</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      يمكنك إلغاء اشتراكك في أي وقت من خلال إعدادات الحساب. سيستمر الوصول حتى نهاية فترة الفوترة المدفوعة.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. الملكية الفكرية</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">6.1 حقوق المنصة</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      جميع حقوق الملكية الفكرية في المنصة والتقنيات المستخدمة مملوكة لشركة MaxP AI.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">6.2 بيانات المستخدم</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      تحتفظ بملكية بياناتك ومحتواك. تمنحنا ترخيصاً محدوداً لاستخدام هذه البيانات لتقديم الخدمة.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. إخلاء المسؤولية</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  تُقدم المنصة "كما هي" دون أي ضمانات صريحة أو ضمنية. لا نضمن أن الخدمة ستكون متاحة دون انقطاع أو خالية من الأخطاء.
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>لا نضمن دقة أو اكتمال المعلومات</li>
                  <li>لا نتحمل مسؤولية الأضرار الناتجة عن استخدام المنصة</li>
                  <li>لا نضمن أمان البيانات بنسبة 100%</li>
                  <li>لا نتحمل مسؤولية أعمال أطراف ثالثة</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. تحديد المسؤولية</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  في أي حال من الأحوال، لن تتجاوز مسؤوليتنا الإجمالية المبلغ المدفوع من قبلك خلال الـ 12 شهراً السابقة للحادث.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. إنهاء الخدمة</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">9.1 الإنهاء من قبلك</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      يمكنك إنهاء حسابك في أي وقت من خلال إعدادات الحساب أو التواصل معنا.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">9.2 الإنهاء من قبلنا</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      يحق لنا إنهاء أو تعليق حسابك في حالة انتهاك هذه الشروط أو لأسباب أمنية.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. القانون المطبق</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  تخضع هذه الشروط لقوانين المملكة العربية السعودية. أي نزاع سيتم حله وفقاً للقوانين السعودية.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. التغييرات على الشروط</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سنقوم بإشعارك بالتغييرات المهمة قبل 30 يوماً من دخولها حيز التنفيذ.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">12. التواصل معنا</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  لأي استفسارات حول شروط الاستخدام، يرجى التواصل معنا:
                </p>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>البريد الإلكتروني:</strong> elhnnawyfromnew@gmail.com<br />
                    <strong>الهاتف:</strong> +201123087745<br />
                    <strong>العنوان:</strong> مصر
                    <br />
                    هذه السياسة تخص تطبيق <strong>m2</strong> التابع لشركة <strong>MaxP AI</strong> 
  والموقع الإلكتروني الرسمي 
  <a href="https://www.maxp-ai.pro" className="text-blue-600"> https://www.maxp-ai.pro</a>.
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

export default TermsOfService;

