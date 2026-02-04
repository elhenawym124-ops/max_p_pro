import React, { useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useTheme } from '../../hooks/useTheme';

/**
 * MUI Theme Wrapper
 * يربط بين نظام الـ theme الخاص بالتطبيق (Tailwind) ونظام MUI theme
 */

interface MuiThemeWrapperProps {
    children: React.ReactNode;
}

export const MuiThemeWrapper: React.FC<MuiThemeWrapperProps> = ({ children }) => {
    // Use optional chaining and fallback to prevent errors
    let actualTheme = 'light';
    let derivedTheme = 'light';
    
    try {
        const theme = useTheme();
        actualTheme = theme.actualTheme;
        derivedTheme = theme.derivedTheme;
    } catch (error) {
        console.warn('⚠️ MuiThemeWrapper: ThemeProvider not available, using default light theme');
    }

    // Use derivedTheme (effective theme) instead of actualTheme to respect storefront overrides
    const effectiveTheme = derivedTheme || actualTheme;

    const muiTheme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: effectiveTheme,
                    ...(effectiveTheme === 'light'
                        ? {
                            // Light mode colors
                            primary: {
                                main: '#2563eb', // blue-600
                                light: '#3b82f6', // blue-500
                                dark: '#1d4ed8', // blue-700
                            },
                            secondary: {
                                main: '#10b981', // green-500
                                light: '#34d399', // green-400
                                dark: '#059669', // green-600
                            },
                            background: {
                                default: '#f9fafb', // gray-50
                                paper: '#ffffff',
                            },
                            text: {
                                primary: '#111827', // gray-900
                                secondary: '#6b7280', // gray-500
                            },
                        }
                        : {
                            // Dark mode colors
                            primary: {
                                main: '#3b82f6', // blue-500
                                light: '#60a5fa', // blue-400
                                dark: '#2563eb', // blue-600
                            },
                            secondary: {
                                main: '#10b981', // green-500
                                light: '#34d399', // green-400
                                dark: '#059669', // green-600
                            },
                            background: {
                                default: '#111827', // gray-900
                                paper: '#1f2937', // gray-800
                            },
                            text: {
                                primary: '#f9fafb', // gray-50
                                secondary: '#d1d5db', // gray-300
                            },
                        }),
                },
                typography: {
                    fontFamily: [
                        'Cairo',
                        'Inter',
                        '-apple-system',
                        'BlinkMacSystemFont',
                        '"Segoe UI"',
                        'Roboto',
                        '"Helvetica Neue"',
                        'Arial',
                        'sans-serif',
                    ].join(','),
                },
                direction: 'rtl',
                components: {
                    MuiPaper: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                            },
                        },
                    },
                    MuiAppBar: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                            },
                        },
                    },
                },
            }),
        [effectiveTheme]
    );

    return (
        <MuiThemeProvider theme={muiTheme}>
            <CssBaseline />
            {children}
        </MuiThemeProvider>
    );
};
