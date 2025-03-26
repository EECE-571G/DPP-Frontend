import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box } from '@mui/material';
import WalletConnect from './components/WalletConnect';
import Dashboard, { Pool } from './components/Dashboard';
import Swap from './components/Swap';
import Liquidity from './components/Liquidity';
import Governance, { Proposal } from './components/Governance';

const App: React.FC = () => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  // Sample pool data
  const samplePools: Pool[] = [
    { id: 1, name: "ETH/DAI Pool", tokenA: "ETH", tokenB: "DAI", currentPrice: 2000 },
    { id: 2, name: "BTC/USDT Pool", tokenA: "BTC", tokenB: "USDT", currentPrice: 30000 },
    { id: 3, name: "UNI/USDC Pool", tokenA: "UNI", tokenB: "USDC", currentPrice: 5 }
  ];

  const handleWalletConnect = (address: string) => {
    setWalletAddress(address);
    setWalletConnected(true);
  };

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

  return (
    <div>
      {!walletConnected ? (
        <WalletConnect onConnect={handleWalletConnect} />
      ) : (
        <>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6">DPP Frontend</Typography>
              <Box flexGrow={1} />
              <Typography variant="subtitle1">{walletAddress}</Typography>
            </Toolbar>
          </AppBar>
          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
            centered
          >
            <Tab label="Dashboard" />
            <Tab label="Swap" />
            <Tab label="Liquidity" />
            <Tab label="Governance" />
          </Tabs>
          <Box p={2}>
            {selectedTab === 0 && (
              <Dashboard
                pools={samplePools}
                selectedPool={selectedPool}
                onSelectPool={setSelectedPool}
              />
            )}
            {selectedTab === 1 && <Swap selectedPool={selectedPool} />}
            {selectedTab === 2 && <Liquidity selectedPool={selectedPool} />}
            {selectedTab === 3 && (
              <Governance
                proposals={proposals}
                addProposal={addProposal}
                voteOnProposal={voteOnProposal}
              />
            )}
          </Box>
        </>
      )}
    </div>
  );
};

export default App;
