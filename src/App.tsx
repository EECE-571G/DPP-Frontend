import React, { useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Components & Layout
import WalletConnect from './components/WalletConnect';
import Dashboard from './components/Dashboard';
import Swap from './components/Swap';
import Liquidity from './components/Liquidity';
import Governance from './components/Governance/Governance';
import DashboardLayout from './layout/DashboardLayout';
import AppBarAccount from './components/AppBarAccount';

// Context Providers
import { AppProvider } from './contexts/AppProvider';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { BalancesProvider } from './contexts/BalancesContext';
import { PoolsProvider } from './contexts/PoolsContext';
import { GovernanceProvider } from './contexts/GovernanceContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { SnackbarProvider } from './contexts/SnackbarProvider';

// Types
import { Navigation } from './types';

// MUI Components & Icons
import { Box, Fade } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GavelIcon from '@mui/icons-material/Gavel';

// --- Navigation Structure ---
const NAVIGATION_CONFIG: Navigation = [
    { segment: 'dashboard', title: 'Dashboard', icon: <DashboardIcon /> },
    { segment: 'swap', title: 'Swap', icon: <SwapHorizIcon /> },
    { segment: 'liquidity', title: 'Liquidity', icon: <AccountBalanceWalletIcon /> },
    { segment: 'governance', title: 'Governance', icon: <GavelIcon /> },
];

// --- Main App Content Component ---
// This component renders the main layout OR the WalletConnect screen
const AppContent: React.FC = () => {
    const location = useLocation();
    const { session } = useAuthContext();

    // --- Navigation Memo ---
    const navigation = useMemo(() => NAVIGATION_CONFIG, []);

    // --- Wallet Connect Screen ---
    if (!session) {
        return (
            <WalletConnect />
        );
    }

    // --- Render Main Application Layout ---
    return (
        <AppProvider
            navigation={navigation}
            window={window}
        >
            <DashboardLayout
                slots={{
                    toolbarContent: AppBarAccount,
                }}
            >
                <Fade in={true} key={location.pathname} timeout={300}>
                    <Box>
                        <Routes>
                            {/* Routes now render components that consume context directly */}
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/swap" element={<Swap />} />
                            <Route path="/liquidity" element={<Liquidity />} />
                            <Route path="/governance" element={<Governance />} />
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </Box>
                </Fade>
            </DashboardLayout>
        </AppProvider>
    );
};


// --- Root App Component ---
// This component sets up all the providers
const App: React.FC = () => {
    return (
        // Order of Providers Matters:
        // SnackbarProvider at the top so any hook can use it.
        // LoadingProvider next for action loading states.
        // AuthProvider next as BalancesProvider depends on it.
        // BalancesProvider next.
        // PoolsProvider and GovernanceProvider can be parallel.
        <SnackbarProvider>
            <LoadingProvider>
                 <AuthProvider>
                    <BalancesProvider>
                        <PoolsProvider>
                            <GovernanceProvider>
                                <AppContent />
                            </GovernanceProvider>
                        </PoolsProvider>
                    </BalancesProvider>
                 </AuthProvider>
            </LoadingProvider>
         </SnackbarProvider>
    );
};

export default App;