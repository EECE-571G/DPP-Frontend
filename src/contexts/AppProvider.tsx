import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import { ThemeProvider, createTheme, PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Navigation, Router, Session, Authentication, ColorMode } from '../types';

// Define the shape of the context value
interface AppContextType {
  navigation: Navigation;
  router: Router;
  theme: ReturnType<typeof createTheme>;
  window?: Window; // Keep for potential future use (e.g., responsive hooks)
  session: Session | null;
  authentication: Authentication;
  colorMode: ColorMode;
  // Add other global state/functions if needed later
  // e.g., global loading states, error handlers
}

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Custom hook for consuming the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Define props for the provider component
interface AppProviderProps {
  navigation: Navigation;
  router: Router;
  window?: Window;
  children: ReactNode;
  session: Session | null;
  authentication: Authentication;
}

// The Provider Component
export const AppProvider: React.FC<AppProviderProps> = ({
  navigation,
  router,
  window,
  children,
  session,
  authentication,
}) => {
  // --- Theme / Color Mode ---
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<PaletteMode>(prefersDarkMode ? 'dark' : 'light');

  const colorMode = useMemo<ColorMode>(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prevMode: PaletteMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [mode] // Depend only on mode
  );

  // Define theme options based on the current mode
  const themeOptions = useMemo(() => ({
      palette: {
        mode,
      },
    }), [mode]);

  // Create the theme instance
  const theme = useMemo(() => createTheme(themeOptions), [themeOptions]);
  // --- End Theme / Color Mode ---


  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<AppContextType>(() => ({
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