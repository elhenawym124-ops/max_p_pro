import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuthSimple';
import { tokenManager } from '../utils/tokenManager';

export default function DebugAuth() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  useEffect(() => {
    const token = tokenManager.getAccessToken();
    if (token) {
      try {
        const parts = token.split('.');
        const payload = JSON.parse(atob(parts[1]));
        setTokenInfo(payload);
      } catch (e) {
        setTokenInfo({ error: 'Invalid token format' });
      }
    }
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', direction: 'ltr' }}>
      <h1>🔍 Auth Debug Page</h1>
      
      <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>useAuth Hook Status</h2>
        <pre>{JSON.stringify({
          isLoading,
          isAuthenticated,
          hasUser: !!user,
          userRole: user?.role,
          userEmail: user?.email,
          userId: user?.id
        }, null, 2)}</pre>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Local Storage</h2>
        <pre>{JSON.stringify({
          accessToken: !!localStorage.getItem('accessToken') ? 'EXISTS' : 'MISSING',
          refreshToken: !!localStorage.getItem('refreshToken') ? 'EXISTS' : 'MISSING',
          user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : 'MISSING'
        }, null, 2)}</pre>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Session Storage</h2>
        <pre>{JSON.stringify({
          accessToken: !!sessionStorage.getItem('accessToken') ? 'EXISTS' : 'MISSING',
          refreshToken: !!sessionStorage.getItem('refreshToken') ? 'EXISTS' : 'MISSING'
        }, null, 2)}</pre>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Token Payload</h2>
        <pre>{JSON.stringify(tokenInfo, null, 2)}</pre>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          }}
          style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Clear All Storage & Reload
        </button>
      </div>
    </div>
  );
}
