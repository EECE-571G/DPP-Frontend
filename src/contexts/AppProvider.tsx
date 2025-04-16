import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import { ThemeProvider, createTheme, PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Navigation, ColorMode, AppContextType } from '../types';

// Create the context
const AppContext = createContext<Omit<AppContextType, 'session' | 'authentication' | 'availableAccounts'> | undefined>(undefined);

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
  window?: Window;
  children: ReactNode;
}

// The Provider Component
export const AppProvider: React.FC<AppProviderProps> = ({
  navigation,
  window,
  children,
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
    [mode]
  );

  const themeOptions = useMemo(() => ({ palette: { mode } }), [mode]);
  const theme = useMemo(() => createTheme(themeOptions), [themeOptions]);
  // --- End Theme / Color Mode ---

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    navigation,
    theme,
    window,
    colorMode,
  }), [navigation, theme, window, colorMode]);

  return (
    <AppContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppContext.Provider>
  );
};