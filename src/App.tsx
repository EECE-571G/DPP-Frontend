import React, { useMemo } from 'react';
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
import { Navigation } from './types';

// Utilities & Mock Data
import { MOCK_USER_BALANCES } from './utils/mockData';

// Hooks
import { useLoadingState } from './hooks/useLoadingState';
import { useSnackbar } from './hooks/useSnackbar';
import { useAuth } from './hooks/useAuth';
import { useAppActions } from './hooks/useAppActions';
import { usePools } from './hooks/usePools';
import { useProposals } from './hooks/useProposals';
import { useGovernanceData } from './hooks/useGovernanceData';

// MUI Components
import { Snackbar, Alert, Box, Fade } from '@mui/material';

// MUI Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GavelIcon from '@mui/icons-material/Gavel';

const App: React.FC = () => {

    // --- Custom Hooks ---
    const { isLoading, setLoading } = useLoadingState();
    const { snackbar, showSnackbar, handleCloseSnackbar } = useSnackbar();

    // Use the data-fetching/state hooks
    const { pools, selectedPool, setSelectedPool, isLoadingPools } = usePools();
    const { proposals, isLoadingProposals } = useProposals();
    const { governanceStatus, metaData, isLoadingGovernanceData } = useGovernanceData();

    // Use the refactored useAuth hook
    const {
        session,
        availableAccounts,
        userBalances,
        setUserBalances,
        authentication,
        isConnecting
    } = useAuth({
        setLoading,
        showSnackbar,
        mockUserBalances: MOCK_USER_BALANCES
    });

    // Pass data/setters from useAuth to useAppActions
    const actions = useAppActions({
        setLoading,
        showSnackbar,
        session,
        userBalances,
        setUserBalances
    });

    // --- Router ---
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
                    isProcessing={isConnecting || isLoading['connectWallet']}
                />
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
            <DashboardLayout
                slots={{
                    sidebarFooter: SidebarFooterAccount,
                    toolbarContent: AppBarAccount,
                }}
            >
                <Fade in={true} key={location.pathname} timeout={300}>
                    <Box>
                        <Routes>
                            <Route
                                path="/dashboard"
                                element={
                                    <Dashboard
                                        pools={pools}
                                        selectedPool={selectedPool}
                                        onSelectPool={setSelectedPool} // Pass setter from usePools
                                        userBalances={userBalances}
                                        isLoadingPools={isLoadingPools} // Pass loading state
                                        isLoadingBalances={isLoading['fetchBalances'] ?? false} // Example if you add balance loading
                                    />
                                }
                            />
                            <Route
                                path="/swap"
                                element={
                                    <Swap
                                        selectedPool={selectedPool}
                                        userBalances={userBalances}
                                        onSwap={actions.handleSwap}
                                        isLoading={isLoading['swap']}
                                        isPoolLoading={isLoadingPools} // Pass pool loading state
                                    />
                                }
                            />
                            <Route
                                path="/liquidity"
                                element={
                                    <Liquidity
                                        selectedPool={selectedPool}
                                        userBalances={userBalances}
                                        onAddLiquidity={actions.handleAddLiquidity}
                                        onRemoveLiquidity={actions.handleRemoveLiquidity}
                                        loadingStates={{ add: isLoading['addLiquidity'], remove: isLoading['removeLiquidity'] }}
                                    />
                                }
                            />
                            <Route
                                path="/governance"
                                element={
                                    <Governance
                                        proposals={proposals}
                                        governanceStatus={governanceStatus}
                                        userBalances={userBalances}
                                        voteWithRange={actions.handleVoteWithRange}
                                        delegateVotes={actions.handleDelegate}
                                        loadingStates={isLoading}
                                        currentUserAddress={session?.user.address}
                                        metaData={metaData ?? { id: 'N/A', time: 'N/A', stage: 'Loading...' }}
                                        // You might want specific loading states for proposals/governance data
                                        // isLoadingProposals={isLoadingProposals}
                                        // isLoadingGovernanceData={isLoadingGovernanceData}
                                    />
                                }
                            />
                             <Route path="/" element={<Navigate to="/dashboard" replace />} />
                             <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </Box>
                </Fade>
            </DashboardLayout>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </AppProvider>
    );
};

export default App;