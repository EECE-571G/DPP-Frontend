// src/App.tsx
import React, { useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Components & Layout
import WalletConnect from './components/WalletConnect';
import Dashboard from './components/Dashboard';
import Swap from './components/Swap';
import Liquidity from './components/Liquidity';
import Governance from './components/Governance/Governance';
import Rewards from './components/Rewards'
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
import { TimeProvider } from './contexts/TimeContext';

// Types
import { Navigation } from './types';

// MUI Components & Icons
import { Box, Fade } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GavelIcon from '@mui/icons-material/Gavel';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

// --- Navigation Structure ---
const NAVIGATION_CONFIG: Navigation = [
    { segment: 'dashboard', title: 'Dashboard', icon: <DashboardIcon /> },
    { segment: 'swap', title: 'Swap', icon: <SwapHorizIcon /> },
    { segment: 'liquidity', title: 'Liquidity', icon: <AccountBalanceWalletIcon /> },
    { segment: 'rewards', title: 'Rewards', icon: <EmojiEventsIcon /> },
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
    // AppProvider handles theme/basic layout context
    // DashboardLayout is the visual structure
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
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/swap" element={<Swap />} />
                            <Route path="/liquidity" element={<Liquidity />} />
                            <Route path="/rewards" element={<Rewards />} />
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
const App: React.FC = () => {
    return (
        <SnackbarProvider>
            <LoadingProvider>
                 <AuthProvider>
                    <TimeProvider>
                        <BalancesProvider>
                            <PoolsProvider>
                                <GovernanceProvider>
                                    <AppContent />
                                </GovernanceProvider>
                            </PoolsProvider>
                        </BalancesProvider>
                    </TimeProvider>
                 </AuthProvider>
            </LoadingProvider>
         </SnackbarProvider>
    );
};

export default App;