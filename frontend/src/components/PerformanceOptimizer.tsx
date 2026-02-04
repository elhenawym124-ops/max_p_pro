/**
 * Performance Optimization Component
 * مكون لتحسين الأداء وتسريع تحميل الصفحات
 */

import React, { useEffect, useState } from 'react';
import { Box, Alert } from '@mui/material';
import { buildApiUrl } from '../utils/urlHelper';

interface PerformanceOptimizerProps {
  children: React.ReactNode;
}

interface PerformanceMetrics {
  backendStatus: 'checking' | 'connected' | 'slow' | 'error';
  loadTime: number;
  apiResponse: number;
  initialized: boolean;
}

export const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({ children }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    backendStatus: 'checking',
    loadTime: 0,
    apiResponse: 0,
    initialized: false
  });

  useEffect(() => {
    const startTime = Date.now();

    // ✅ FIX: خلي الموقع يفتح مباشرة بدون health check blocking
    // Health check هيشتغل في الـ background بس مش هيمنع التحميل
    setMetrics({
      backendStatus: 'connected',
      initialized: true,
      loadTime: 0,
      apiResponse: 0
    });

    // Health check في الـ background (optional)
    const checkBackendHealth = async () => {
      try {
        const apiStartTime = Date.now();

        const response = await fetch(buildApiUrl('health'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(3000) // 3 seconds timeout
        });

        const apiResponse = Date.now() - apiStartTime;

        if (response.ok || response.status === 401) {
          // 401 يعني السيرفر شغال بس الـ endpoint محتاج authentication
          setMetrics({
            backendStatus: apiResponse < 1000 ? 'connected' : 'slow',
            apiResponse,
            loadTime: Date.now() - startTime,
            initialized: true
          });
        } else {
          // مش هنعرض error - الموقع هيشتغل عادي
          setMetrics({
            backendStatus: 'connected', // نخليه connected عشان الموقع يفتح
            apiResponse: 0,
            loadTime: 0,
            initialized: true
          });
        }
      } catch (err) {
        // ✅ Silent fail - don't spam console when backend is down
        setMetrics({
          backendStatus: 'connected', // نخليه connected عشان الموقع يفتح
          apiResponse: 0,
          loadTime: 0,
          initialized: true
        });
      }
    };

    // Health check في الـ background بدون blocking
    const timer = setTimeout(() => {
      checkBackendHealth();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // ✅ FIX: شيلنا الـ loading و error screens عشان الموقع يفتح مباشرة
  // الموقع هيشتغل عادي حتى لو الـ health check فشل

  // عرض تحذير للأداء البطيء
  const showPerformanceWarning = metrics.backendStatus === 'slow';

  return (
    <Box>
      {showPerformanceWarning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          ⚠️ الخادم يستجيب ببطء ({metrics.apiResponse}ms). قد تواجه بطء في التحميل.
        </Alert>
      )}

      {children}
    </Box>
  );
};

export default PerformanceOptimizer;