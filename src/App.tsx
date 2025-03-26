import React, { useState, useMemo } from 'react';
import WalletConnect from './components/WalletConnect';
import Dashboard from './components/Dashboard';
import Swap from './components/Swap';
import Liquidity from './components/Liquidity';
import Governance, { Proposal } from './components/Governance';
import DashboardLayout, { SidebarFooterProps } from './layout/DashboardLayout';
import { AppProvider, Session, Router, Navigation } from './components/AppProvider';
import { Pool } from './components/Dashboard';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';

// Import MUI icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GavelIcon from '@mui/icons-material/Gavel';

// Import Account components
import {
  Account,
  AccountPreview,
  AccountPopoverFooter,
  SignOutButton,
  AccountPreviewProps
} from './components/Account';

// Create sidebar footer account component
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

const App: React.FC = () => {
  const [pathname, setPathname] = useState('/dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  // Router implementation
  const router = useMemo<Router>(() => {
    return {
      pathname,
      searchParams: new URLSearchParams(),
      navigate: (path) => setPathname(path),
    };
  }, [pathname]);

  // Authentication implementation
  const authentication = useMemo(() => {
    return {
      signIn: (address: string) => {
        setSession({
          user: {
            address,
            name: `User ${address.substring(0, 6)}`,
          },
        });
      },
      signOut: () => {
        setSession(null);
      },
    };
  }, []);

  // Sample pool data
  const samplePools: Pool[] = [
    { id: 1, name: "ETH/DAI Pool", tokenA: "ETH", tokenB: "DAI", currentPrice: 2000 },
    { id: 2, name: "BTC/USDT Pool", tokenA: "BTC", tokenB: "USDT", currentPrice: 30000 },
    { id: 3, name: "UNI/USDC Pool", tokenA: "UNI", tokenB: "USDC", currentPrice: 5 }
  ];

  // Navigation structure
  const NAVIGATION: Navigation = [
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
  ];

  const addProposal = (proposal: Proposal) => {
    setProposals([...proposals, proposal]);
  };

  const voteOnProposal = (id: number, vote: "yes" | "no") => {
    setProposals(proposals.map(proposal => {
      if (proposal.id === id) {
        return {
          ...proposal,
          votes: {
            ...proposal.votes,
            [vote]: proposal.votes[vote] + 1
          }
        };
      }
      return proposal;
    }));
  };

  // Render the content based on pathname
  const renderContent = () => {
    const segment = pathname.substring(1);
    
    switch (segment) {
      case 'dashboard':
        return <Dashboard pools={samplePools} selectedPool={selectedPool} onSelectPool={setSelectedPool} />;
      case 'swap':
        return <Swap selectedPool={selectedPool} />;
      case 'liquidity':
        return <Liquidity selectedPool={selectedPool} />;
      case 'governance':
        return <Governance proposals={proposals} addProposal={addProposal} voteOnProposal={voteOnProposal} />;
      default:
        return <Dashboard pools={samplePools} selectedPool={selectedPool} onSelectPool={setSelectedPool} />;
    }
  };

  // Render wallet connect if no session
  if (!session) {
    return <WalletConnect onConnect={(address) => authentication.signIn(address)} />;
  }

  return (
    <AppProvider
      navigation={NAVIGATION}
      router={router}
      theme={{}} // Pass empty object since theme is created in AppProvider
      window={window}
      session={session}
      authentication={authentication}
    >
      <DashboardLayout
        slots={{
          sidebarFooter: SidebarFooterAccount
        }}
      >
        {renderContent()}
      </DashboardLayout>
    </AppProvider>
  );
};

export default App;