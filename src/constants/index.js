// src/constants/index.js
import { ethers } from 'ethers';

const poolManagerRaw = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const positionManagerRaw = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const desiredPricePoolHookRaw = "0xb6a68881d3Ee8FB71CafEe3CBB1A1a8747fd2aC4";
const desiredPricePoolHelperRaw = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const token0Raw = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
const token1Raw = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
const token2Raw = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
const governanceTokenRaw = "0x08aEd9A0e715b4D37BBF25E8E1fE6bd89e93BF0e";
const governanceContractRaw = desiredPricePoolHookRaw;

// Export checksummed addresses
export const POOL_MANAGER_ADDRESS = poolManagerRaw ? ethers.getAddress(poolManagerRaw) : ethers.ZeroAddress;
export const DESIRED_PRICE_POOL_HOOK_ADDRESS = desiredPricePoolHookRaw ? ethers.getAddress(desiredPricePoolHookRaw) : ethers.ZeroAddress;
export const DESIRED_PRICE_POOL_HELPER_ADDRESS = desiredPricePoolHelperRaw ? ethers.getAddress(desiredPricePoolHelperRaw) : ethers.ZeroAddress;
export const POSITION_MANAGER_ADDRESS = positionManagerRaw ? ethers.getAddress(positionManagerRaw) : ethers.ZeroAddress;
export const TOKEN_A_ADDRESS = token0Raw ? ethers.getAddress(token0Raw) : ethers.ZeroAddress;
export const TOKEN_B_ADDRESS = token1Raw ? ethers.getAddress(token1Raw) : ethers.ZeroAddress;
export const TOKEN_C_ADDRESS = token2Raw ? ethers.getAddress(token2Raw) : ethers.ZeroAddress;
export const GOVERNANCE_TOKEN_ADDRESS = governanceTokenRaw ? ethers.getAddress(governanceTokenRaw) : ethers.ZeroAddress;
export const GOVERNANCE_CONTRACT_ADDRESS = governanceContractRaw ? ethers.getAddress(governanceContractRaw) : ethers.ZeroAddress;

// --- Pool Configuration ---
export const POOL_TICK_SPACING = 64;
export const DYNAMIC_FEE_FLAG = 0x800000;

export const DEFAULT_BASE_FEE_PER_TICK = 30;
export const DEFAULT_HOOK_FEE = 25;

// --- Network Configuration ---
export const TARGET_NETWORK_CHAIN_ID = 31337n
export const TARGET_NETWORK_NAME = "Anvil Localhost";
export const EXPLORER_URL_BASE = null;

// --- Other Constants ---
// List of tokens to fetch balances for
export const RELEVANT_TOKEN_ADDRESSES = [
    TOKEN_A_ADDRESS,
    TOKEN_B_ADDRESS,
    TOKEN_C_ADDRESS,
    GOVERNANCE_TOKEN_ADDRESS,
].filter(addr => addr !== ethers.ZeroAddress);