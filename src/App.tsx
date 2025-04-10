import React, { useState, useMemo } from 'react';

// Components & Layout
import WalletConnect from './components/WalletConnect';
import Dashboard from './components/Dashboard';
import Swap from './components/Swap';
import Liquidity from './components/Liquidity';
import Governance from './components/Governance/Governance';
import DashboardLayout from './layout/DashboardLayout';
import { AppProvider } from './contexts/AppProvider';
import AppBarAccount from './components/AppBarAccount';
import { SidebarFooterAccount } from './components/Account/SiderbarAccount'; // Import the extracted component

// Types
import { Session, Router, Navigation, Pool, Proposal } from './types';

// Utilities & Mock Data
import {
    MOCK_POOLS,
    MOCK_PROPOSALS,
    MOCK_USER_BALANCES,
    MOCK_GOVERNANCE_STATUS,
} from './utils/mockData';

// Hooks
import { useLoadingState } from './hooks/useLoadingState';
import { useSnackbar } from './hooks/useSnackbar';
import { useAuth } from './hooks/useAuth';
import { useAppActions } from './hooks/useAppActions';

// MUI Components
import { Snackbar, Alert, Box, Fade } from '@mui/material';

// MUI Icons (Consider moving to a central export if used widely)
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GavelIcon from '@mui/icons-material/Gavel';

const App: React.FC = () => {
    // --- Core State ---
    const [pathname, setPathname] = useState('/dashboard');
    const [session, setSession] = useState<Session | null>(null);
    const [availableAccounts, setAvailableAccounts] = useState<string[] | null>(null);
    const [userBalances, setUserBalances] = useState<Record<string, number>>({});

    // --- Static/Mock Data State ---
    const [pools] = useState<Pool[]>(MOCK_POOLS);
    const [selectedPool, setSelectedPool] = useState<Pool | null>(MOCK_POOLS[0] ?? null);
    const [proposals, setProposals] = useState<Proposal[]>(MOCK_PROPOSALS);
    const [governanceStatus] = useState<number[]>(MOCK_GOVERNANCE_STATUS);

    // --- Custom Hooks ---
    const { isLoading, setLoading } = useLoadingState(); // Get loading state and setter
    const { snackbar, showSnackbar, handleCloseSnackbar } = useSnackbar(); // Get snackbar state and controls
    const authentication = useAuth({ // Get auth functions
        setSession,
        setAvailableAccounts,
        setUserBalances,
        setLoading,
        showSnackbar,
        session,
        availableAccounts,
        mockUserBalances: MOCK_USER_BALANCES // Pass mock data
    });
    const actions = useAppActions({ // Get action handlers
        setLoading,
        showSnackbar,
        setUserBalances,
        session,
        userBalances
    });

    // --- Router Implementation ---
    const router = useMemo<Router>(() => ({
        pathname,
        searchParams: new URLSearchParams(), // Keep simple or replace with lib
        navigate: (path: string) => setPathname(path),
    }), [pathname]);

    // --- Navigation Structure ---
    const NAVIGATION: Navigation = useMemo(() => [
        { segment: 'dashboard', title: 'Dashboard', icon: <DashboardIcon /> },
        { segment: 'swap', title: 'Swap', icon: <SwapHorizIcon /> },
        { segment: 'liquidity', title: 'Liquidity', icon: <AccountBalanceWalletIcon /> },
        { segment: 'governance', title: 'Governance', icon: <GavelIcon /> },
    ], []);

    // --- Render Content ---
    const renderContent = () => {
        const segment = pathname.substring(1);

        switch (segment) {
            case 'dashboard':
                return <Dashboard pools={pools} selectedPool={selectedPool} onSelectPool={setSelectedPool} userBalances={userBalances} />;
            case 'swap':
                return <Swap selectedPool={selectedPool} userBalances={userBalances} onSwap={actions.handleSwap} isLoading={isLoading['swap']} />;
            case 'liquidity':
                return <Liquidity selectedPool={selectedPool} userBalances={userBalances} onAddLiquidity={actions.handleAddLiquidity} onRemoveLiquidity={actions.handleRemoveLiquidity} loadingStates={{ add: isLoading['addLiquidity'], remove: isLoading['removeLiquidity'] }} />;
            case 'governance':
                return <Governance proposals={proposals} governanceStatus={governanceStatus} userBalances={userBalances} voteWithRange={actions.handleVoteWithRange} delegateVotes={actions.handleDelegate} loadingStates={isLoading} currentUserAddress={session?.user.address} />;
            default:
                 // Redirect unknown paths to dashboard
                 if (pathname !== '/dashboard') {
                     router.navigate('/dashboard');
                     // Return null or dashboard momentarily while redirect happens
                     return null;
                 }
                return <Dashboard pools={pools} selectedPool={selectedPool} onSelectPool={setSelectedPool} userBalances={userBalances} />;
        }
    };

    // --- Conditional Rendering: Wallet Connect vs Main App ---
    if (!session) {
        return (
            <>
                <WalletConnect
                    onConnect={authentication.signIn}
                    isProcessing={isLoading['connectWallet']}
                />
                {/* Snackbar for connection errors etc. */}
                <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </>
        );
    }

    // --- Render Main Application Layout ---
    return (
        <AppProvider // Consider if AppProvider context is actively used
            navigation={NAVIGATION}
            router={router}
            window={window} // Pass window object if needed by context consumers
            session={session}
            authentication={authentication}
            availableAccounts={availableAccounts}
        >
            <DashboardLayout
                slots={{
                    sidebarFooter: SidebarFooterAccount, // Use the imported component
                    toolbarContent: AppBarAccount,
                }}
            >
                <Fade in={true} key={pathname} timeout={300}>
                    <Box> {/* Wrapper for Fade */}
                        {renderContent()}
                    </Box>
                </Fade>
            </DashboardLayout>

            {/* Global Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </AppProvider>
    );
};

export default App;