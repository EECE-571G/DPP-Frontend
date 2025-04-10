import React from 'react';
import { createTheme, PaletteMode } from '@mui/material/styles';

// --- General App Structure ---
export interface NavigationItem {
  kind?: 'header' | 'item';
  segment?: string;
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode; // e.g., for badges or extra icons
}

export type Navigation = NavigationItem[];

export interface Router {
  pathname: string;
  searchParams: URLSearchParams;
  navigate: (path: string) => void;
}

export interface ColorMode {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

// --- User and Session ---
export interface User {
  name?: string;
  email?: string; // Less likely needed for Web3, but keeping for flexibility
  address: string; // Primary identifier from wallet
  image?: string; // e.g., ENS avatar
  type: 'metamask' | 'simulated';
}

export interface Session {
  user: User;
}

export interface Authentication {
  signIn: (
    primaryAddress: string,
    allAccounts: string[] | null,
    type: 'metamask' | 'simulated'
  ) => void;
  signOut: () => void;
  switchAccount: (newAddress: string) => void;
}

// --- Pool Data ---
export interface Pool {
  id: number; // Unique identifier for the pool
  name: string; // User-friendly name (e.g., "ETH/DAI Pool")
  tokenA: string; // Symbol (e.g., "ETH")
  tokenB: string; // Symbol (e.g., "DAI")
  tokenA_Address?: string; // Optional: Contract address of token A
  tokenB_Address?: string; // Optional: Contract address of token B
  poolAddress?: string; // Optional: Contract address of the specific Uniswap V4 pool
  currentPrice: number; // Current market price (e.g., 1 tokenA = X tokenB)
  desiredPrice: number; // Community-set target price (1 tokenA = X tokenB)
  baseFee: number; // Base protocol fee percentage (e.g., 0.003 for 0.3%)
  // Add other relevant pool stats as needed:
  // tvl?: number; // Total Value Locked (in USD)
  // volume24h?: number; // 24-hour trading volume
  // lpTokenSymbol?: string; // Symbol for the LP token if applicable
}

// --- Governance Data ---
export interface ProposalVote {
  yes: number; // Represents voting power (e.g., vDPP token weight)
  no: number; // Represents voting power
}

export type ProposalStatus = 'pending' | 'active' | 'succeeded' | 'defeated' | 'executed';

export interface Proposal {
  id: number; // Unique identifier for the proposal
  poolId: number; // Link proposal to a specific pool
  proposer: string; // Address of the proposer
  proposedDesiredPrice: number; // The new desired price being proposed
  description: string; // Justification or details about the proposal
  endBlock?: number; // Block number when voting ends
  status: ProposalStatus;
  votingPowerCommitted?: number; // Example: total vDPP power used in votes
}

// --- Component-Specific Props ---

// Account Preview Specific Props
export interface AccountPreviewProps {
  handleClick: (event: React.MouseEvent<HTMLElement>) => void;
  open: boolean; // Is the popover open?
  variant?: 'condensed' | 'expanded'; // Controls layout style
}

// Sidebar Footer Props for DashboardLayout
export interface SidebarFooterProps {
  mini: boolean; // Is the sidebar minimized?
}

export interface AppContextType {
  navigation: Navigation;
  router: Router;
  theme: ReturnType<typeof createTheme>;
  window?: Window;
  session: Session | null;
  authentication: Authentication;
  colorMode: ColorMode;
  availableAccounts: string[] | null;
}