import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import { ThemeProvider, createTheme, PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export interface NavigationItem {
  kind?: 'header' | 'item';
  segment?: string;
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export interface Router {
  pathname: string;
  searchParams: URLSearchParams;
  navigate: (path: string) => void;
}

export interface User {
  name?: string;
  email?: string;
  address: string;
  image?: string;
}

export interface Session {
  user: User;
}

export interface Authentication {
  signIn: (address: string) => void;
  signOut: () => void;
}

export interface ColorMode {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

export type Navigation = NavigationItem[];

interface AppContextType {
  navigation: Navigation;
  router: Router;
  theme: any;
  window?: Window;
  session: Session | null;
  authentication: Authentication;
  colorMode: ColorMode;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  navigation: Navigation;
  router: Router;
  theme: any;
  window?: Window;
  children: ReactNode;
  session: Session | null;
  authentication: Authentication;
}

export const AppProvider: React.FC<AppProviderProps> = ({
  navigation,
  router,
  window,
  children,
  session,
  authentication,
}) => {
  const [mode, setMode] = useState<PaletteMode>('dark');

  const colorMode = useMemo<ColorMode>(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prevMode: PaletteMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [mode]
  );

  // Just use MUI's default theme with the mode
  const theme = useMemo(() => 
    createTheme({
      palette: {
        mode,
      },
    }),
    [mode]
  );

  const contextValue = useMemo(() => ({
    navigation,
    router,
    theme,
    window,
    session,
    authentication,
    colorMode,
  }), [navigation, router, theme, window, session, authentication, colorMode]);

  return (
    <AppContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppContext.Provider>
  );
};