import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, UserCircleIcon, CheckIcon } from '@heroicons/react/24/outline';
import { apiClient } from '../../../services/apiClient';

interface TeamMember {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
}

interface AssignmentDropdownProps {
    currentAssignee: string | null;
    currentAssigneeName?: string;
    onAssign: (userId: string | null) => void;
    disabled?: boolean;
}

const AssignmentDropdown: React.FC<AssignmentDropdownProps> = ({
    currentAssignee,
    currentAssigneeName,
    onAssign,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch team members from API
    useEffect(() => {
        const fetchTeamMembers = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get('/tasks/company-users');
                if (response.data?.success && response.data?.data) {
                    const users = response.data.data.map((user: any) => ({
                        id: user.id,
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        email: user.email || ''
                    }));
                    setTeamMembers(users);
                }
            } catch (error) {
                console.error('Error fetching team members:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTeamMembers();
    }, []);

    const handleSelect = (userId: string | null) => {
        onAssign(userId);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}
          ${currentAssignee ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-700'}
        `}
            >
                <UserCircleIcon className="w-4 h-4" />
                <span>{currentAssigneeName || 'غير معين'}</span>
                <ChevronDownIcon className="w-4 h-4" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-80 overflow-y-auto">
                        <div className="py-1">
                            {/* Unassign option */}
                            <button
                                onClick={() => handleSelect(null)}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    ❌
                                </div>
                                <span className="flex-1 text-right">إلغاء التعيين</span>
                                {!currentAssignee && (
                                    <CheckIcon className="w-4 h-4 text-blue-600" />
                                )}
                            </button>

                            <div className="border-t border-gray-100 my-1" />

                            {/* Team members */}
                            {teamMembers.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => handleSelect(member.id)}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                        {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                                    </div>
                                    <div className="flex-1 text-right">
                                        <p className="font-medium text-gray-900">
                                            {member.firstName} {member.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500">{member.email}</p>
                                    </div>
                                    {currentAssignee === member.id && (
                                        <CheckIcon className="w-4 h-4 text-blue-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AssignmentDropdown;
