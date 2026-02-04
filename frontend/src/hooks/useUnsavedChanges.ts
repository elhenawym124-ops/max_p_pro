import { useEffect, useRef } from 'react';

interface UseUnsavedChangesOptions {
    hasUnsavedChanges: boolean;
    message?: string;
}

/**
 * Custom hook to warn users about unsaved changes before leaving the page
 * @param hasUnsavedChanges - Boolean indicating if there are unsaved changes
 * @param message - Optional custom warning message
 */
export const useUnsavedChanges = ({
    hasUnsavedChanges,
    message = 'لديك تغييرات غير محفوظة. هل أنت متأكد من المغادرة؟'
}: UseUnsavedChangesOptions) => {
    const messageRef = useRef(message);

    useEffect(() => {
        messageRef.current = message;
    }, [message]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                // Modern browsers ignore custom messages and show their own
                // But we still need to set returnValue for the event to work
                e.returnValue = messageRef.current;
                return messageRef.current;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    return {
        hasUnsavedChanges
    };
};
