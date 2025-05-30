// src/types/index.ts
import React from 'react';
import { createTheme, PaletteMode } from '@mui/material/styles';

// --- General App Structure ---
export interface NavigationItem {
  kind?: 'header' | 'item';
  segment?: string;
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export type Navigation = NavigationItem[];

export interface ColorMode {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

// --- User and Session ---
export interface User {
  name?: string;
  address: string;
}

export interface Session {
  user: User;
}

export interface Authentication {
  signIn: (
    primaryAddress: string,
    allAccounts: string[] | null,
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
  tokenA_Address?: string; // Contract address of token A
  tokenB_Address?: string; // Contract address of token B
  poolAddress?: string; // Contract address of the specific Uniswap V4 pool
  currentPrice: number; // Current market price (e.g., 1 tokenA = X tokenB)
  desiredPrice: number; // Community-set target price (1 tokenA = X tokenB)
  baseFee: number; // Base protocol fee
}

// --- Governance Data ---
export interface ProposalVote {
  yes: number; // Represents voting power (e.g., DPP token weight)
  no: number; // Represents voting power
}

export type ProposalStatus = 'PreVote' | 'Vote' | 'FinalVote' | 'PreExecution' | 'ExecutionReady';

export interface Proposal {
  id: number; // Unique identifier for the proposal
  poolId: number; // Link proposal to a specific pool
  proposer: string; // Address of the proposer
  proposedDesiredPrice: number; // The new desired price being proposed
  description: string; // Justification or details about the proposal
  endBlock?: number; // Block number when voting ends
  status: ProposalStatus;
  votingPowerCommitted?: number; // Example: total DPP power used in votes
}

// --- Component-Specific Props ---
export interface AppContextType {
  navigation: Navigation;
  theme: ReturnType<typeof createTheme>;
  window?: Window;
  session: Session | null;
  authentication: Authentication;
  colorMode: ColorMode;
  availableAccounts: string[] | null;
}
