import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { apiService, SavedReply } from '../../services/apiService';

interface SavedRepliesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReply: (reply: SavedReply) => void;
}

const SavedReplies: React.FC<SavedRepliesProps> = ({ isOpen, onClose, onSelectReply }) => {
  const [replies, setReplies] = useState<SavedReply[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newReply, setNewReply] = useState({
    title: '',
    content: '',
    category: 'custom' as SavedReply['category']
  });

  const categories = [
    { key: 'all', label: 'الكل', color: 'bg-gray-100' },
    { key: 'welcome', label: 'ترحيب', color: 'bg-green-100 text-green-800' },
    { key: 'thanks', label: 'شكر', color: 'bg-blue-100 text-blue-800' },
    { key: 'apology', label: 'اعتذار', color: 'bg-red-100 text-red-800' },
    { key: 'followup', label: 'متابعة', color: 'bg-yellow-100 text-yellow-800' },
    { key: 'closing', label: 'ختام', color: 'bg-purple-100 text-purple-800' },
    { key: 'custom', label: 'مخصص', color: 'bg-gray-100 text-gray-800' }
  ];

  const loadReplies = async () => {
    try {
      const savedReplies = await apiService.getSavedReplies();
      setReplies(savedReplies);
    } catch (error) {
      console.error('Error loading saved replies:', error);
    }
  };

  const createReply = async () => {
    if (!newReply.title || !newReply.content) return;

    try {
      await apiService.createSavedReply(newReply);
      loadReplies();
      setNewReply({ title: '', content: '', category: 'custom' });
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating reply:', error);
    }
  };

  const deleteReply = async (id: string) => {
    try {
      await apiService.deleteSavedReply(id);
      loadReplies();
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  const filteredReplies = replies.filter(reply => {
    const matchesCategory = selectedCategory === 'all' || reply.category === selectedCategory;
    const matchesSearch = reply.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         reply.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    loadReplies();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">الردود المحفوظة</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="البحث في الردود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          
          <div className="flex space-x-2 mt-2">
            {categories.map(category => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedCategory === category.key
                    ? category.color
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Create New Reply */}
        {isCreating && (
          <div className="p-4 border-b bg-gray-50">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="عنوان الرد"
                value={newReply.title}
                onChange={(e) => setNewReply({...newReply, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              
              <textarea
                placeholder="نص الرد"
                value={newReply.content}
                onChange={(e) => setNewReply({...newReply, content: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20"
              />
              
              <select
                value={newReply.category}
                onChange={(e) => setNewReply({...newReply, category: e.target.value as SavedReply['category']})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {categories.filter(c => c.key !== 'all').map(category => (
                  <option key={category.key} value={category.key}>
                    {category.label}
                  </option>
                ))}
              </select>
              
              <div className="flex space-x-2">
                <button
                  onClick={createReply}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  حفظ
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewReply({ title: '', content: '', category: 'custom' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Replies List */}
        <div className="flex-1 overflow-y-auto p-4">
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full mb-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
            >
              <PlusIcon className="w-4 h-4 ml-2" />
              إضافة رد جديد
            </button>
          )}

          <div className="space-y-3">
            {filteredReplies.map(reply => (
              <div key={reply.id} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">{reply.title}</h4>
                  <div className="flex space-x-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      categories.find(c => c.key === reply.category)?.color || 'bg-gray-100'
                    }`}>
                      {categories.find(c => c.key === reply.category)?.label}
                    </span>
                    <button
                      onClick={() => deleteReply(reply.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{reply.content}</p>
                
                <button
                  onClick={() => onSelectReply(reply)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  استخدام الرد
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedReplies;
