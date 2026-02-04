import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Conversations from '../../pages/conversations/Conversations';
import ConversationsImproved from '../../pages/conversations/ConversationsImproved';

const ConversationsRouter: React.FC = () => {
  return (
    <Routes>
      {/* الصفحة الأصلية */}
      <Route path="/conversations" element={<Conversations />} />
      
      {/* الصفحة المحسنة للاختبار */}
      <Route path="/conversations-improved" element={<ConversationsImproved />} />
      
      {/* الصفحة المحسنة كافتراضية (يمكن تفعيلها لاحقاً) */}
      {/* <Route path="/conversations" element={<ConversationsImproved />} /> */}
    </Routes>
  );
};

export default ConversationsRouter;
