import React, { useState, useMemo, useCallback } from 'react';
import WalletConnect from './components/WalletConnect';
import Dashboard from './components/Dashboard';
import Swap from './components/Swap';
import Liquidity from './components/Liquidity';
import Governance from './components/Governance/Governance';
import DashboardLayout from './layout/DashboardLayout';
import { AppProvider } from './contexts/AppProvider';
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

// MUI Components
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Snackbar from '@mui/material/Snackbar';
import Alert, { AlertColor } from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';

// MUI Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GavelIcon from '@mui/icons-material/Gavel';

// Account components
import {
  Account,
  AccountPreview,
  AccountPopoverFooter,
  SignOutButton,
} from './components/Account/Account';

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
                filter: (theme: { palette: { mode: string; }; }) =>
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

// --- Mock Data ---
const SAMPLE_POOLS: Pool[] = [
  { id: 1, name: "ETH/DAI Pool", tokenA: "ETH", tokenB: "DAI", currentPrice: 2000, desiredPrice: 2100, baseFee: 0.003 },
  { id: 2, name: "BTC/USDT Pool", tokenA: "BTC", tokenB: "USDT", currentPrice: 30000, desiredPrice: 30000, baseFee: 0.003 },
  { id: 3, name: "UNI/USDC Pool", tokenA: "UNI", tokenB: "USDC", currentPrice: 5, desiredPrice: 5.5, baseFee: 0.01 },
];

const INITIAL_PROPOSALS: Proposal[] = [
    { id: 1, poolId: 1, proposer: '0x123...', proposedDesiredPrice: 2150, description: 'Adjust ETH/DAI desired price slightly higher', votes: { yes: 150, no: 20 }, status: 'active'},
    { id: 2, poolId: 3, proposer: '0x456...', proposedDesiredPrice: 6, description: 'Increase UNI/USDC target to $6', votes: { yes: 500, no: 120 }, status: 'active'},
];

const INITIAL_BALANCES: Record<string, number> = {
    ETH: 10,
    DAI: 5000,
    BTC: 0.5,
    USDT: 10000,
    UNI: 1000,
    USDC: 2000,
    vDPP: 500, // User's governance token balance
};
// --- End Mock Data ---

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
  const [selectedPool, setSelectedPool] = useState<Pool | null>(SAMPLE_POOLS[0]); // Default to first pool
  const [pools] = useState<Pool[]>(SAMPLE_POOLS); // Read-only for now
  const [proposals, setProposals] = useState<Proposal[]>(INITIAL_PROPOSALS);
  const [userBalances, setUserBalances] = useState<Record<string, number>>({}); // Start empty, set on login

  // --- Loading States ---
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({
      connectWallet: false,
      swap: false,
      addLiquidity: false,
      removeLiquidity: false,
      createProposal: false,
      vote: false, // Will use vote_ID later
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
      searchParams: new URLSearchParams(), // Keep simple for now
      navigate: (path: string) => setPathname(path),
    };
  }, [pathname]);

  // --- Authentication Simulation ---
  const authentication = useMemo(() => {
    return {
      signIn: (address: string) => {
        setLoading('connectWallet', true);
        // Simulate async wallet connection
        setTimeout(() => {
          const user: User = {
            address,
            name: `User ${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
          };
          setSession({ user });
          setUserBalances(INITIAL_BALANCES); // Set mock balances on login
          setLoading('connectWallet', false);
          showSnackbar(`Wallet ${user.name} connected!`, 'success');
        }, 1000); // 1 second delay
      },
      signOut: () => {
        setSession(null);
        setUserBalances({}); // Clear balances on logout
        showSnackbar('Wallet disconnected', 'info');
      },
    };
  }, [setLoading, showSnackbar]);

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
  const addProposal = useCallback((poolId: number, proposedPrice: number, description: string) => {
    if (!session?.user.address) return; // Need user logged in
    setLoading('createProposal', true);

    // Simulate transaction
    setTimeout(() => {
        const newProposal: Proposal = {
            id: proposals.length + 1 + Math.floor(Math.random() * 1000), // More unique ID
            poolId,
            proposer: session.user.address,
            proposedDesiredPrice: proposedPrice,
            description,
            votes: { yes: 0, no: 0 },
            status: 'active',
        };
        setProposals(prev => [...prev, newProposal]);
        setLoading('createProposal', false);
        showSnackbar('Proposal created successfully!', 'success');
    }, 1500); // Simulate block time
  }, [proposals.length, session, setLoading, showSnackbar]);

  const voteOnProposal = useCallback((id: number, vote: "yes" | "no") => {
    setLoading(`vote_${id}`, true); // Loading state per proposal vote

    // Simulate transaction
    setTimeout(() => {
        setProposals(prevProposals => prevProposals.map(proposal => {
            if (proposal.id === id && proposal.status === 'active') {
                // Simulate adding 1 vote (would be token-weighted later)
                return {
                    ...proposal,
                    votes: {
                        ...proposal.votes,
                        [vote]: proposal.votes[vote] + 1 // Simple increment for now
                    }
                };
            }
            return proposal;
        }));
        setLoading(`vote_${id}`, false);
        showSnackbar(`Voted '${vote}' on proposal #${id}`, 'success');
    }, 1000); // Simulate block time
  }, [setLoading, showSnackbar]);


  // --- Swap Action (Simulated) ---
  const handleSwap = useCallback((sellToken: string, buyToken: string, sellAmount: number, expectedBuyAmount: number) => {
      setLoading('swap', true);
      setTimeout(() => {
          // Simulate success/failure (e.g., 5% chance of failure)
          const success = Math.random() > 0.05;
          if (success) {
              // Update balances (simple simulation)
              setUserBalances(prev => ({
                  ...prev,
                  [sellToken]: (prev[sellToken] || 0) - sellAmount,
                  [buyToken]: (prev[buyToken] || 0) + expectedBuyAmount,
              }));
              showSnackbar(`Swapped ${sellAmount.toFixed(4)} ${sellToken} for ${expectedBuyAmount.toFixed(4)} ${buyToken}`, 'success');
          } else {
              showSnackbar('Swap failed (Simulated Error)', 'error');
          }
          setLoading('swap', false);
      }, 2000); // Longer delay for swap
  }, [setLoading, showSnackbar]);

  // --- Liquidity Actions (Simulated) ---
  const handleAddLiquidity = useCallback((tokenA: string, tokenB: string, amountA: number, amountB: number) => {
      setLoading('addLiquidity', true);
      setTimeout(() => {
          const success = Math.random() > 0.05;
          if (success) {
              setUserBalances(prev => ({
                  ...prev,
                  [tokenA]: (prev[tokenA] || 0) - amountA,
                  [tokenB]: (prev[tokenB] || 0) - amountB,
                  // Simulate receiving LP tokens or rewards later
              }));
               // Simulate getting some vDPP reward
              const simulatedReward = (amountA + amountB) * 0.01; // Totally arbitrary reward logic based on total amount
               setUserBalances(prev => ({
                   ...prev,
                   vDPP: (prev.vDPP || 0) + simulatedReward
               }));
              showSnackbar(`Added ${amountA.toFixed(4)} ${tokenA} and ${amountB.toFixed(4)} ${tokenB} liquidity. Got ${simulatedReward.toFixed(2)} vDPP (Simulated).`, 'success');
          } else {
              showSnackbar('Add liquidity failed (Simulated Error)', 'error');
          }
          setLoading('addLiquidity', false);
      }, 2500);
  }, [setLoading, showSnackbar]);

  const handleRemoveLiquidity = (tokenA: string, tokenB: string, lpAmount: number) => {
    console.log('Simulating Remove Liquidity:', { tokenA, tokenB, lpAmount });
    setIsLoading(prev => ({ ...prev, removeLiquidity: true }));
    // Simulate async operation
    setTimeout(() => {
        // ** TODO: Update actual balances based on LP amount removed **
        // This requires more complex logic based on pool reserves / LP token value
        // For now, we just log and stop loading
         setUserBalances(prev => {
             const lpTokenSymbol = `LP-${tokenA}/${tokenB}`;
             const currentLp = prev[lpTokenSymbol] ?? 0;
             // Rough estimation for demo - DO NOT USE IN PRODUCTION
             const fraction = lpAmount / (currentLp || 1); // Avoid division by zero
             const estA = (prev[tokenA] ?? 0) * fraction * 0.5; // Fake return
             const estB = (prev[tokenB] ?? 0) * fraction * 0.5; // Fake return

             return {
                 ...prev,
                 [lpTokenSymbol]: Math.max(0, currentLp - lpAmount),
                 // Cannot accurately add back without pool state
                 // [tokenA]: (prev[tokenA] ?? 0) + estA,
                 // [tokenB]: (prev[tokenB] ?? 0) + estB,
             };
         });
        setIsLoading(prev => ({ ...prev, removeLiquidity: false }));
        // Show success feedback
    }, 1500);
  };

  // --- Render Content ---
  const renderContent = () => {
    const segment = pathname.substring(1); // Remove leading '/'

    switch (segment) {
      case 'dashboard':
        return <Dashboard pools={pools} selectedPool={selectedPool} onSelectPool={setSelectedPool} userBalances={userBalances} />;
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
                    pools={pools} // Pass pools for context if needed
                    proposals={proposals}
                    addProposal={addProposal}
                    voteOnProposal={voteOnProposal}
                    loadingStates={isLoading} // Pass all loading states for voting buttons etc.
                />;
      default:
        // Navigate to dashboard if path is unknown
        return <Dashboard pools={pools} selectedPool={selectedPool} onSelectPool={setSelectedPool} userBalances={userBalances} />;
    }
  };

  // Render wallet connect if no session
  if (!session) {
    return (
        <>
            <WalletConnect
                onConnect={authentication.signIn}
                isLoading={isLoading['connectWallet']}
            />
            {/* Snackbar for connection errors if needed */}
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
  }

  return (
    // Pass empty object for theme, it's created within AppProvider now
    <AppProvider
      navigation={NAVIGATION}
      router={router}
      window={window}
      session={session}
      authentication={authentication}
    >
      <DashboardLayout
        slots={{
          sidebarFooter: SidebarFooterAccount
          // toolbarAccount could be added here if needed
        }}
      >
        {/* Wrap the main content area with Fade for page transitions */}
        <Fade in={true} key={pathname} timeout={500}>
            {/* The Box wrapper is useful if Fade needs a single child */}
            <Box>
              {renderContent()}
            </Box>
        </Fade>
      </DashboardLayout>

       {/* Global Snackbar for feedback */}
       <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
           <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
               {snackbar.message}
           </Alert>
       </Snackbar>
    </AppProvider>
  );
};

export default App;