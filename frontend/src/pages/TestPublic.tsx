import React from 'react';

const TestPublic: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-lg shadow-lg text-center max-w-md mx-4">
        <h1 className="text-3xl font-bold text-green-600 mb-5">
          ✅ نجح!
        </h1>
        <p className="text-lg text-gray-800 mb-2">
          هذه صفحة عامة بدون أي authentication
        </p>
        <p className="text-sm text-gray-600">
          إذا رأيت هذه الرسالة، فالصفحة تعمل بشكل صحيح
        </p>
        <div className="mt-8 p-5 bg-blue-50 rounded-lg">
          <p className="text-base text-blue-800 font-bold">
            🎉 لم يتم التحويل لصفحة تسجيل الدخول!
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestPublic;
