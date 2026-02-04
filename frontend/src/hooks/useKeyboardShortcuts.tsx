import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    handler: (event: KeyboardEvent) => void;
    preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
    [key: string]: ((event: KeyboardEvent) => void) | KeyboardShortcut;
}

const useKeyboardShortcuts = (shortcuts: UseKeyboardShortcutsOptions) => {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable elements
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            for (const [key, value] of Object.entries(shortcuts)) {
                const shortcut: KeyboardShortcut =
                    typeof value === 'function' ? { key, handler: value } : value;

                const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
                const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
                const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
                const altMatch = shortcut.altKey ? event.altKey : !event.altKey;

                if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                    if (shortcut.preventDefault !== false) {
                        event.preventDefault();
                    }
                    shortcut.handler(event);
                    break;
                }
            }
        },
        [shortcuts]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

export default useKeyboardShortcuts;
