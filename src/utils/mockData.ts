import { Pool, Proposal, User } from '../types';

// Mock USD prices (replace with oracle/API data later)
export const MOCK_TOKEN_PRICES: Record<string, number> = {
  ETH: 2000,
  DAI: 1,
  BTC: 30000,
  USDT: 1,
  USDC: 1,
  UNI: 5,
  DPP: 0.5, // Example price for a hypothetical pool token
  vDPP: 1.5, // Example price for the governance token
};

// Mock Pool Data
export const MOCK_POOLS: Pool[] = [
  {
    id: 1,
    name: 'Ether / Dai Stablecoin',
    tokenA: 'ETH',
    tokenB: 'DAI',
    currentPrice: 2005.5, // 1 ETH = 2005.5 DAI
    desiredPrice: 2000,   // Target: 1 ETH = 2000 DAI
    baseFee: 0.003,       // 0.3%
  },
  {
    id: 2,
    name: 'Wrapped Bitcoin / USDC',
    tokenA: 'BTC',
    tokenB: 'USDC',
    currentPrice: 29850.75, // 1 BTC = 29850.75 USDC
    desiredPrice: 30000,    // Target: 1 BTC = 30000 USDC
    baseFee: 0.0025,      // 0.25%
  },
  {
    id: 3,
    name: 'Uniswap / Ether',
    tokenA: 'UNI',
    tokenB: 'ETH',
    currentPrice: 0.0025, // 1 UNI = 0.0025 ETH
    desiredPrice: 0.0026, // Target: 1 UNI = 0.0026 ETH
    baseFee: 0.003,       // 0.3%
  },
];

// Mock Governance Proposals
export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 101,
    poolId: 1, // ETH/DAI
    proposer: '0x1234...abcd',
    proposedDesiredPrice: 2010,
    description: 'Adjust ETH/DAI target slightly higher due to recent market trends.',
    votes: { yes: 15000, no: 2500 },
    status: 'active',
    endBlock: 18000000, // Example block number
  },
  {
    id: 102,
    poolId: 2, // BTC/USDC
    proposer: '0x5678...efgh',
    proposedDesiredPrice: 31000,
    description: 'Increase BTC target to reflect bullish sentiment.',
    votes: { yes: 8000, no: 9500 },
    status: 'active',
    endBlock: 18005000,
  },
    {
    id: 100, // Example of a past proposal
    poolId: 1, // ETH/DAI
    proposer: '0x9abc...wxyz',
    proposedDesiredPrice: 1950,
    description: 'Previous attempt to lower the ETH/DAI target.',
    votes: { yes: 5000, no: 12000 },
    status: 'defeated', // Example status
    endBlock: 17900000,
  },
];

// Mock User Balances (Token Symbol -> Amount)
export const MOCK_USER_BALANCES: Record<string, number> = {
  ETH: 2.5,
  DAI: 5000,
  BTC: 0.1,
  USDC: 10000,
  UNI: 250,
  vDPP: 1200, // Governance tokens
  // Example LP token balance (use consistent naming)
  'LP-ETH/DAI': 15.5,
};

// Mock User for Session
export const MOCK_USER: User = {
  address: '0xAbCdEfGhIjKlMnOpQrStUvWxYz1234567890aBcDeF',
  name: 'Satoshi Nakamoto', // Example name
  email: '',
  image: undefined,
  type: 'simulated',

};