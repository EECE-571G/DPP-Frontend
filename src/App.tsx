import React, { useState } from 'react';
import WalletConnect from './components/WalletConnect';
import Dashboard from './components/Dashboard';
import Swap from './components/Swap';
import Liquidity from './components/Liquidity';
import Governance, { Proposal } from './components/Governance';
import DashboardLayout from './layout/DashboardLayout';
import { Pool } from './components/Dashboard';

const App: React.FC = () => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  // Render the content based on selected navigation index
  const renderContent = () => {
    switch (selectedIndex) {
      case 0:
        return <Dashboard pools={samplePools} selectedPool={selectedPool} onSelectPool={setSelectedPool} />;
      case 1:
        return <Swap selectedPool={selectedPool} />;
      case 2:
        return <Liquidity selectedPool={selectedPool} />;
      case 3:
        return <Governance proposals={proposals} addProposal={addProposal} voteOnProposal={voteOnProposal} />;
      default:
        return <Dashboard pools={samplePools} selectedPool={selectedPool} onSelectPool={setSelectedPool} />;
    }
  };

  if (!walletConnected) {
    return <WalletConnect onConnect={handleWalletConnect} />;
  }

  return (
    <DashboardLayout selectedIndex={selectedIndex} onMenuItemClick={setSelectedIndex} walletAddress={walletAddress}>
      {renderContent()}
    </DashboardLayout>
  );
};

export default App;
