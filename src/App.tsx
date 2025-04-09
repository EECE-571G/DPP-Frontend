import React, { useState, useMemo, useCallback } from 'react';

// Components & Layout
import WalletConnect from './components/WalletConnect';
import Dashboard from './components/Dashboard';
import Swap from './components/Swap';
import Liquidity from './components/Liquidity';
import Governance from './components/Governance/Governance';
import DashboardLayout from './layout/DashboardLayout';
import { AppProvider } from './contexts/AppProvider';
import {
  Account,
  AccountPreview,
  AccountPopoverFooter,
  SignOutButton,
} from './components/Account/Account';
import AppBarAccount from './components/AppBarAccount';

// Types
import {
  Session,
  Router,
  Navigation,
  Pool,
  Proposal,
  User,
  SidebarFooterProps,
  AccountPreviewProps
} from './types';

// Utilities & Mock Data
import {
    MOCK_POOLS,
    MOCK_PROPOSALS,
    MOCK_USER_BALANCES,
    MOCK_TOKEN_PRICES,
    MOCK_GOVERNANCE_STATUS,
} from './utils/mockData';

import { formatBalance, shortenAddress } from './utils/formatters';

// MUI Components
import { Typography, Divider, Stack, Snackbar, Alert, Box, Fade, AlertColor } from '@mui/material';

// MUI Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GavelIcon from '@mui/icons-material/Gavel';


// --- Sidebar Account Components ---
function AccountSidebarPreview(props: AccountPreviewProps & { mini: boolean }) {
  const { handleClick, open, mini } = props;
  return (
    <Stack direction="column" p={0}>
      <Divider />
      <AccountPreview
        variant={mini ? 'condensed' : 'expanded'}
        handleClick={handleClick}
        open={open}
      />
    </Stack>
  );
}

function SidebarFooterAccountPopover() {
  return (
    <Stack direction="column" width={250}>
      <Typography variant="body2" sx={{ p: 2, pb: 1 }}>
        Wallet Connected
      </Typography>
      <Divider />
      <AccountPopoverFooter>
        <SignOutButton />
      </AccountPopoverFooter>
    </Stack>
  );
}

const createPreviewComponent = (mini: boolean) => {
  function PreviewComponent(props: AccountPreviewProps) {
    return <AccountSidebarPreview {...props} mini={mini} />;
  }
  return PreviewComponent;
};

function SidebarFooterAccount({ mini }: SidebarFooterProps) {
  const PreviewComponent = React.useMemo(() => createPreviewComponent(mini), [mini]);
  return (
    <Account
      slots={{
        preview: PreviewComponent,
        popoverContent: SidebarFooterAccountPopover,
      }}
      slotProps={{
        popover: {
          transformOrigin: { horizontal: 'left', vertical: 'bottom' },
          anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
          disableAutoFocus: true,
          slotProps: {
            paper: {
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: (theme) =>
                  `drop-shadow(0px 2px 8px ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.32)'})`,
                mt: 1,
                '&::before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  bottom: 10,
                  left: 0,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translate(-50%, -50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            },
          },
        },
      }}
    />
  );
}
// --- End Sidebar Account Components ---


// --- Snackbar State Type ---
interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}
// --- End Snackbar State Type ---


const App: React.FC = () => {
  const [pathname, setPathname] = useState('/dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<string[] | null>(null);
  const [pools] = useState<Pool[]>(MOCK_POOLS);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(MOCK_POOLS[0] ?? null); // Default to first pool if exists
  const [proposals] = useState<Proposal[]>(MOCK_PROPOSALS);
  const [userBalances, setUserBalances] = useState<Record<string, number>>({});
  const [governanceStatus] = useState<number[]>(MOCK_GOVERNANCE_STATUS);
  // --- Loading States ---
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({
      connectWallet: false,
      swap: false,
      addLiquidity: false,
      removeLiquidity: false,
      delegate: false,
  });

  // --- Snackbar State ---
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info'});

  const showSnackbar = useCallback((message: string, severity: AlertColor = 'success') => {
      setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === 'clickaway') {
          return;
      }
      setSnackbar(prev => ({ ...prev, open: false }));
  };

  // --- Loading State Helper ---
  const setLoading = useCallback((key: string, value: boolean) => {
      setIsLoading(prev => ({ ...prev, [key]: value }));
  }, []);


  // --- Router Implementation ---
  const router = useMemo<Router>(() => {
    return {
      pathname,
      searchParams: new URLSearchParams(),
      navigate: (path: string) => setPathname(path),
    };
  }, [pathname]);

  // --- Authentication Simulation ---
  const authentication = useMemo(() => ({
    signIn: (
        primaryAddress: string,
        allAccounts: string[] | null,
        type: 'metamask' | 'simulated'
    ) => {
      setLoading('connectWallet', true);
      // Simulate processing delay
      setTimeout(() => {
        const user: User = {
          address: primaryAddress,
          name: `${type === 'metamask' ? 'MetaMask' : 'Simulated'}`,
          type: type,
        };
        setSession({ user });
        setAvailableAccounts(allAccounts);

        // Set balances (Use mock for both types in this example)
        // In a real app, fetch balances for primaryAddress if type is 'metamask'
        setUserBalances(MOCK_USER_BALANCES);

        setLoading('connectWallet', false);
        showSnackbar(`Wallet ${user.name} connected via ${type === 'metamask' ? 'MetaMask' : 'Simulation'}!`, 'success');
      }, 500);
    },
    signOut: () => {
      setSession(null);
      setAvailableAccounts(null); // Clear available accounts on sign out
      setUserBalances({});
      showSnackbar('Wallet disconnected', 'info');
    },
    // New function to switch active account
    switchAccount: (newAddress: string) => {
        if (session && session.user.type === 'metamask' && availableAccounts?.includes(newAddress)) {
            // console.log(`Switching account to: ${newAddress}`);
            // Update the user object in the session
            setSession(prevSession => prevSession ? ({
                ...prevSession,
                user: { ...prevSession.user, address: newAddress }
            }) : null);

            // ** Important: In a real app, trigger balance fetching for the newAddress here **
            // For this mock setup, we can just keep the MOCK_USER_BALANCES or clear/reset them
            // setUserBalances({}); // Option 1: Clear balances
            // setUserBalances(MOCK_USER_BALANCES); // Option 2: Keep mock balances (simpler for demo)
            showSnackbar(`Switched to account ${shortenAddress(newAddress)}`, 'info');
            // Optionally navigate the user somewhere, e.g., back to dashboard
            // router.navigate('/dashboard');
        } else {
            console.warn("Account switching failed: Invalid state or address.");
            showSnackbar('Failed to switch account', 'error');
        }
    },
  }),
  [setLoading, showSnackbar, session, availableAccounts]
);

  // --- Navigation Structure ---
    const NAVIGATION: Navigation = useMemo(() => [
    {
      segment: 'dashboard',
      title: 'Dashboard',
      icon: <DashboardIcon />,
    },
    {
      segment: 'swap',
      title: 'Swap',
      icon: <SwapHorizIcon />,
    },
    {
      segment: 'liquidity',
      title: 'Liquidity',
      icon: <AccountBalanceWalletIcon />,
    },
    {
      segment: 'governance',
      title: 'Governance',
      icon: <GavelIcon />,
    },
  ], []);

  // --- Governance Actions (Simulated) ---
  const handleVoteWithRange = useCallback(async (proposalId: number, lower: number, upper: number, power: number) => {
    if (!session?.user.address) {
        showSnackbar('Please connect wallet to vote', 'warning');
        throw new Error('User not connected');
    }
    const voteKey = `vote_${proposalId}`;
    setLoading(voteKey, true);

    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay

    const success = Math.random() > 0.1; // 90% success rate
    if (success) {
        // NOTE: We are NOT updating the proposals state here with vote details
        // because aggregation/display of range votes is complex for this frontend simulation.
        // We just log it and show success.
        console.log(`Simulated vote on Proposal #${proposalId}:
            User: ${session.user.address}
            Range: [${lower}, ${upper}]
            Power: ${power} vDPP`);
        showSnackbar(`Successfully voted on proposal #${proposalId} (Simulated)`, 'success');
    } else {
        showSnackbar(`Vote on proposal #${proposalId} failed (Simulated Error)`, 'error');
        throw new Error('Simulated vote failure');
    }

    setLoading(voteKey, false);

  }, [session, setLoading, showSnackbar]);

  const handleDelegate = useCallback(async (targetAddress: string, amount: number) => {
     if (!session?.user.address) {
        showSnackbar('Please connect wallet to delegate', 'warning');
        throw new Error('User not connected');
    }
    const delegateKey = 'delegate';
    setLoading(delegateKey, true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    const success = Math.random() > 0.1;
    if (success) {
        console.log(`Simulated delegation of ${amount} vDPP to ${targetAddress} by ${session.user.address}`);
        showSnackbar(`Successfully delegated ${formatBalance(amount, 2)} vDPP to ${shortenAddress(targetAddress)} (Simulated)`, 'success');
    } else {
        showSnackbar('Delegation Failed (Simulated Error)', 'error');
        throw new Error('Simulated delegation failure');
    }
    setLoading(delegateKey, false);
}, [session, setLoading, showSnackbar]);

  // --- Swap Action (Simulated) ---
  const handleSwap = useCallback(async (sellToken: string, buyToken: string, sellAmount: number, expectedBuyAmount: number) => {
      setLoading('swap', true);
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1500)); // Use Promise for async simulation

      const success = Math.random() > 0.05; // 95% success rate
      if (success) {
          setUserBalances(prev => ({
              ...prev,
              [sellToken]: (prev[sellToken] ?? 0) - sellAmount,
              [buyToken]: (prev[buyToken] ?? 0) + expectedBuyAmount,
          }));
          showSnackbar(`Swapped ${formatBalance(sellAmount, 4)} ${sellToken} for ${formatBalance(expectedBuyAmount, 4)} ${buyToken}`, 'success');
      } else {
          showSnackbar('Swap failed (Simulated Error - Price Moved?)', 'error');
      }
      setLoading('swap', false);

  }, [setLoading, showSnackbar]);

  // --- Liquidity Actions (Simulated) ---
  const handleAddLiquidity = useCallback(async (tokenA: string, tokenB: string, amountA: number, amountB: number) => {
      setLoading('addLiquidity', true);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const success = Math.random() > 0.05;
      if (success) {
            // Simulate receiving LP tokens (crude example)
            const lpTokenSymbol = `LP-${tokenA}/${tokenB}`;
            // Very basic LP amount simulation - DO NOT USE IN PRODUCTION
            const newLpAmount = Math.sqrt(amountA * amountB) * 0.1;

            // Simulate getting some vDPP reward based on USD value (example)
            const valueA = (MOCK_TOKEN_PRICES[tokenA] || 0) * amountA;
            const valueB = (MOCK_TOKEN_PRICES[tokenB] || 0) * amountB;
            const simulatedReward = (valueA + valueB) * 0.005; // Smaller reward factor example

            setUserBalances(prev => ({
                ...prev,
                [tokenA]: (prev[tokenA] ?? 0) - amountA,
                [tokenB]: (prev[tokenB] ?? 0) - amountB,
                [lpTokenSymbol]: (prev[lpTokenSymbol] ?? 0) + newLpAmount,
                vDPP: (prev.vDPP ?? 0) + simulatedReward
            }));
          showSnackbar(`Added liquidity. Received ~${formatBalance(newLpAmount, 6)} LP & ${formatBalance(simulatedReward, 2)} vDPP (Simulated).`, 'success');
      } else {
          showSnackbar('Add liquidity failed (Simulated Error)', 'error');
      }
      setLoading('addLiquidity', false);
  }, [setLoading, showSnackbar]);

  const handleRemoveLiquidity = useCallback(async (tokenA: string, tokenB: string, lpAmount: number) => {
    setLoading('removeLiquidity', true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const lpTokenSymbol = `LP-${tokenA}/${tokenB}`;
    const currentLp = userBalances[lpTokenSymbol] ?? 0;

    if (lpAmount > currentLp) {
        showSnackbar('Cannot remove more LP tokens than you own (Simulated Check)', 'error');
        setLoading('removeLiquidity', false);
        return;
    }

    // ** SIMULATION of getting tokens back **
    // This needs real pool data (reserves) for accuracy. Faking it:
    // const poolRatio = MOCK_POOLS.find(p => p.tokenA === tokenA && p.tokenB === tokenB)?.currentPrice ?? 1; // Example fallback
    // Assume LP value is somewhat proportional (highly inaccurate)
    const estimatedValuePerLp = 10; // Totally fake value
    const totalValueToRemove = lpAmount * estimatedValuePerLp;
    const valueOfA = totalValueToRemove / 2; // Split value 50/50 for demo
    const valueOfB = totalValueToRemove / 2;
    const amountA_returned = valueOfA / (MOCK_TOKEN_PRICES[tokenA] || 1);
    const amountB_returned = valueOfB / (MOCK_TOKEN_PRICES[tokenB] || 1);
    // ** END SIMULATION **

     setUserBalances(prev => ({
         ...prev,
         [lpTokenSymbol]: Math.max(0, currentLp - lpAmount),
         [tokenA]: (prev[tokenA] ?? 0) + amountA_returned,
         [tokenB]: (prev[tokenB] ?? 0) + amountB_returned,
     }));

    showSnackbar(`Removed ${formatBalance(lpAmount, 6)} LP. Received ~${formatBalance(amountA_returned, 4)} ${tokenA} & ${formatBalance(amountB_returned, 4)} ${tokenB} (Simulated).`, 'success');
    setLoading('removeLiquidity', false);
  }, [userBalances, setLoading, showSnackbar]);


  // --- Render Content ---
  const renderContent = () => {
    const segment = pathname.substring(1);

    // Pass the specific loading states needed by each component
    switch (segment) {
      case 'dashboard':
        return <Dashboard
                    pools={pools}
                    selectedPool={selectedPool}
                    onSelectPool={setSelectedPool}
                    userBalances={userBalances}
                    // Pass loading states if Dashboard shows them
                />;
      case 'swap':
        return <Swap
                    selectedPool={selectedPool}
                    userBalances={userBalances}
                    onSwap={handleSwap}
                    isLoading={isLoading['swap']}
                />;
      case 'liquidity':
        return <Liquidity
                    selectedPool={selectedPool}
                    userBalances={userBalances}
                    onAddLiquidity={handleAddLiquidity}
                    onRemoveLiquidity={handleRemoveLiquidity}
                    loadingStates={{ add: isLoading['addLiquidity'], remove: isLoading['removeLiquidity'] }}
                />;
      case 'governance':
        return <Governance
                      proposals={proposals}
                      governanceStatus={governanceStatus}
                      userBalances={userBalances}
                      voteWithRange={handleVoteWithRange}
                      delegateVotes={handleDelegate}
                      loadingStates={isLoading}
                      currentUserAddress={session?.user.address}
                  />;
      default:
        // Redirect unknown paths to dashboard
        if (pathname !== '/dashboard') {
            router.navigate('/dashboard');
        }
        return <Dashboard pools={pools} selectedPool={selectedPool} onSelectPool={setSelectedPool} userBalances={userBalances} />;
    }
  };

  // Render wallet connect if no session
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

  // Render main application layout if session exists
  return (
    <AppProvider
      navigation={NAVIGATION}
      router={router}
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
        {/* Wrap the main content area with Fade for simple page transitions */}
        <Fade in={true} key={pathname} timeout={300}>
            {/* Box wrapper ensures Fade has a single child */}
            <Box>
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