/**
 * Token Manager
 * 
 * Handles token persistence with per-tab isolation using sessionStorage
 * and global persistence using localStorage.
 */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const tokenManager = {
    /**
     * Get the best available access token.
     * Prioritizes sessionStorage (tab-specific) over localStorage (global).
     */
    getAccessToken(): string | null {
        return sessionStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY);
    },

    /**
     * Set access token.
     * Updates BOTH sessionStorage (for current tab isolation) and localStorage (for global fallback).
     */
    setAccessToken(token: string): void {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
    },

    /**
     * Get refresh token.
     * Refresh tokens are usually global, so we prioritize localStorage.
     */
    getRefreshToken(): string | null {
        return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
    },

    /**
     * Set refresh token globally.
     */
    setRefreshToken(token: string): void {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
        sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    },

    /**
     * Clear all tokens from all storage types.
     */
    clearTokens(): void {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
};
