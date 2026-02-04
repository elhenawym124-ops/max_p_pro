import React, { ReactNode } from 'react';
import { AuthProvider } from '../hooks/useAuthSimple';
import { CompanyProvider } from '../contexts/CompanyContext';
import { TimerProvider } from '../contexts/TimerContext';
import { ThemeProvider } from '../hooks/useTheme';
import { MuiThemeWrapper } from '../components/theme/MuiThemeWrapper';
import GlobalToast from '../components/common/GlobalToast';

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <CompanyProvider>
        <TimerProvider>
          <ThemeProvider>
            <MuiThemeWrapper>
              <GlobalToast />
              {children}
            </MuiThemeWrapper>
          </ThemeProvider>
        </TimerProvider>
      </CompanyProvider>
    </AuthProvider>
  );
};

export default AppProviders;
