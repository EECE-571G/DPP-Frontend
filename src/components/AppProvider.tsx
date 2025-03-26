// src/components/AppProvider.tsx
import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import { ThemeProvider, createTheme, PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// --- Interface Exports (Keep these easily accessible) ---
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
  address: string; // Primary identifier from wallet
  image?: string;
}

export interface Session {
  user: User;
}

export interface Authentication {
  signIn: (address: string) => void;
  signOut: () => void;
}

// Added export
export interface ColorMode {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

export type Navigation = NavigationItem[];
// --- End Interface Exports ---


// --- Pool Data Structure (Centralize definition here) ---
export interface Pool {
  id: number;
  name: string;
  tokenA: string; // Symbol
  tokenB: string; // Symbol
  tokenA_Address?: string; // Placeholder for contract address
  tokenB_Address?: string; // Placeholder for contract address
  poolAddress?: string;   // Placeholder for contract address
  currentPrice: number;  // e.g., 1 tokenA = X tokenB
  desiredPrice: number;  // Community-set target price (1 tokenA = X tokenB)
  baseFee: number;       // Base protocol fee percentage (e.g., 0.003 for 0.3%)
  // Add other relevant pool stats later (TVL, volume, etc.)
}
// --- End Pool Data Structure ---

// --- Governance Data Structure ---
export interface Proposal {
    id: number;
    poolId: number; // Link proposal to a specific pool
    proposer: string; // Address of proposer
    proposedDesiredPrice: number;
    description: string;
    votes: {
      yes: number; // Could represent token weight later
      no: number;
    };
    endBlock?: number; // Placeholder for voting deadline
    status: 'pending' | 'active' | 'succeeded' | 'defeated';
}
// --- End Governance Data Structure ---


interface AppContextType {
  navigation: Navigation;
  router: Router;
  theme: ReturnType<typeof createTheme>; // Use inferred theme type
  window?: Window;
  session: Session | null;
  authentication: Authentication;
  colorMode: ColorMode;
  // Add other global state/functions if needed later
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
  // theme: any; // Removed, created internally
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

  // Define theme options once
  const themeOptions = useMemo(() => ({
      palette: {
        mode,
        // Add custom theme overrides here if needed
        // primary: { main: '...' },
      },
      // Add other theme aspects (typography, components defaults)
    }), [mode]);

  // Create the theme
  const theme = useMemo(() => createTheme(themeOptions), [themeOptions]);


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