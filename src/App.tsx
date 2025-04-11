import React, { useState, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Components & Layout
import WalletConnect from './components/WalletConnect';
import Dashboard from './components/Dashboard';
import Swap from './components/Swap';
import Liquidity from './components/Liquidity';
import Governance from './components/Governance/Governance';
import DashboardLayout from './layout/DashboardLayout';
import { AppProvider } from './contexts/AppProvider';
import AppBarAccount from './components/AppBarAccount';
import { SidebarFooterAccount } from './components/Account/SiderbarAccount';

// Types
import { Session, Navigation, Pool, Proposal } from './types';

// Utilities & Mock Data
import {
    MOCK_POOLS,
    MOCK_PROPOSALS,
    MOCK_USER_BALANCES,
    MOCK_GOVERNANCE_STATUS,
    MOCK_GOVERNANCE_METADATA,
} from './utils/mockData';

// Hooks
import { useLoadingState } from './hooks/useLoadingState';
import { useSnackbar } from './hooks/useSnackbar';
import { useAuth } from './hooks/useAuth';
import { useAppActions } from './hooks/useAppActions';

// MUI Components
import { Snackbar, Alert, Box, Fade } from '@mui/material';

// MUI Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GavelIcon from '@mui/icons-material/Gavel';

const App: React.FC = () => {
    // --- Core State ---
    const [session, setSession] = useState<Session | null>(null);
    const [availableAccounts, setAvailableAccounts] = useState<string[] | null>(null);
    const [userBalances, setUserBalances] = useState<Record<string, number>>({});

    // --- Static/Mock Data State ---
    const [pools] = useState<Pool[]>(MOCK_POOLS);
    const [selectedPool, setSelectedPool] = useState<Pool | null>(MOCK_POOLS[0] ?? null);
    const [proposals, setProposals] = useState<Proposal[]>(MOCK_PROPOSALS);
    const [governanceStatus] = useState<number[]>(MOCK_GOVERNANCE_STATUS);
    const [metaData] = useState(MOCK_GOVERNANCE_METADATA);

    // --- Custom Hooks ---
    const { isLoading, setLoading } = useLoadingState();
    const { snackbar, showSnackbar, handleCloseSnackbar } = useSnackbar();
    const authentication = useAuth({
        setSession,
        setAvailableAccounts,
        setUserBalances,
        setLoading,
        showSnackbar,
        session,
        availableAccounts,
        mockUserBalances: MOCK_USER_BALANCES
    });
    const actions = useAppActions({
        setLoading,
        showSnackbar,
        setUserBalances,
        session,
        userBalances
    });

    // --- Router Implementation ---
    const location = useLocation();

    // --- Navigation Structure ---
    const NAVIGATION: Navigation = useMemo(() => [
        { segment: 'dashboard', title: 'Dashboard', icon: <DashboardIcon /> },
        { segment: 'swap', title: 'Swap', icon: <SwapHorizIcon /> },
        { segment: 'liquidity', title: 'Liquidity', icon: <AccountBalanceWalletIcon /> },
        { segment: 'governance', title: 'Governance', icon: <GavelIcon /> },
    ], []);

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
        <AppProvider
            navigation={NAVIGATION}
            window={window}
            session={session}
            authentication={authentication}
            availableAccounts={availableAccounts}
        >
            {/* DashboardLayout now wraps the Routes */}
            <DashboardLayout
                slots={{
                    sidebarFooter: SidebarFooterAccount,
                    toolbarContent: AppBarAccount,
                }}
            >
                {/* Use Routes for page content */}
                <Fade in={true} key={location.pathname} timeout={300}>
                     {/* Wrapper needed for Fade */}
                     <Box>
                        <Routes>
                            <Route
                                path="/dashboard"
                                element={<Dashboard pools={pools} selectedPool={selectedPool} onSelectPool={setSelectedPool} userBalances={userBalances} />}
                            />
                            <Route
                                path="/swap"
                                element={<Swap selectedPool={selectedPool} userBalances={userBalances} onSwap={actions.handleSwap} isLoading={isLoading['swap']} />}
                            />
                            <Route
                                path="/liquidity"
                                element={<Liquidity selectedPool={selectedPool} userBalances={userBalances} onAddLiquidity={actions.handleAddLiquidity} onRemoveLiquidity={actions.handleRemoveLiquidity} loadingStates={{ add: isLoading['addLiquidity'], remove: isLoading['removeLiquidity'] }} />}
                            />
                            <Route
                                path="/governance"
                                element={<Governance proposals={proposals} governanceStatus={governanceStatus} userBalances={userBalances} voteWithRange={actions.handleVoteWithRange} delegateVotes={actions.handleDelegate} loadingStates={isLoading} currentUserAddress={session?.user.address} metaData={metaData} />}
                            />
                             {/* Default route redirects to dashboard */}
                             <Route path="/" element={<Navigate to="/dashboard" replace />} />
                             {/* Catch-all redirects to dashboard */}
                             <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
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