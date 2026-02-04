import React, { useState, useEffect, useRef } from 'react';
import { buildApiUrl } from '../../utils/urlHelper';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMention?: (userId: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onMention,
  placeholder = 'اكتب تعليقك... استخدم @ للإشارة لشخص',
  rows = 3,
  className = ''
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (mentionQuery) {
      const filtered = users.filter(user => 
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(mentionQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
      setSelectedIndex(0);
    } else {
      setFilteredUsers(users);
    }
  }, [mentionQuery, users]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('tasks/company-users'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Check for @ mention
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1] || '');
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        if (filteredUsers[selectedIndex]) {
          e.preventDefault();
          insertMention(filteredUsers[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const insertMention = (user: User) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Find the @ position
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    const beforeMention = value.substring(0, mentionStart);
    
    // Create the mention text
    const mentionText = `@${user.firstName}_${user.lastName}`;
    const newValue = beforeMention + mentionText + ' ' + textAfterCursor;
    
    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery('');
    
    // Notify parent about the mention
    onMention?.(user.id);

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStart + mentionText.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };


  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${className}`}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-64 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto"
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={`w-full flex items-center px-3 py-2 text-right hover:bg-gray-50 ${
                index === selectedIndex ? 'bg-indigo-50' : ''
              }`}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="w-8 h-8 rounded-full ml-2"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center ml-2 text-sm font-medium">
                  {user.firstName.charAt(0)}
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Helper Text */}
      <div className="mt-1 text-xs text-gray-400">
        اكتب @ للإشارة لشخص
      </div>
    </div>
  );
};

export default MentionInput;

// Helper function to extract mentions from text
export const extractMentions = (text: string): string[] => {
  const mentions = text.match(/@(\w+_\w+)/g) || [];
  return mentions.map(m => m.substring(1)); // Remove @ prefix
};

// Helper function to render text with highlighted mentions
export const renderWithMentions = (text: string): React.ReactNode => {
  const parts = text.split(/(@\w+_\w+)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="text-indigo-600 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
};
