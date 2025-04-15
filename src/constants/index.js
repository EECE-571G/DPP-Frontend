// src/constants/index.js
import { ethers } from 'ethers';

// --- Configuration (!!! REPLACE WITH YOUR ACTUAL DEPLOYMENT DATA !!!) ---

const poolManagerRaw = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // <<< FROM LOGS
const desiredPricePoolHookRaw = "0x26F1cd0223Cd26F9303D8414B01B81541ca22Ac4"; // <<< FROM LOGS
const desiredPricePoolHelperRaw = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const positionManagerRaw = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // <<< FROM LOGS (Example, check your Anvil output)
const token0Raw = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";        // <<< FROM LOGS (Token0)
const token1Raw = "0x0165878A594ca255338adfa4d48449f69242Eb8F";        // <<< FROM LOGS (Token1)
const token2Raw = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";        // <<< FROM LOGS (Token2)
const governanceTokenRaw = "0xf1df33493e79c6df4813b81891799fFA53fB42f6";     // <<< REPLACE (Your DPP or equivalent)
const governanceContractRaw = desiredPricePoolHookRaw; // <<< REPLACE (If you have one)

// Export checksummed addresses
export const POOL_MANAGER_ADDRESS = poolManagerRaw ? ethers.getAddress(poolManagerRaw) : ethers.ZeroAddress;
export const DESIRED_PRICE_POOL_HOOK_ADDRESS = desiredPricePoolHookRaw ? ethers.getAddress(desiredPricePoolHookRaw) : ethers.ZeroAddress; // Use ZeroAddress if no hook or standard hook
export const DESIRED_PRICE_POOL_HELPER_ADDRESS = desiredPricePoolHelperRaw ? ethers.getAddress(desiredPricePoolHelperRaw) : ethers.ZeroAddress;
export const POSITION_MANAGER_ADDRESS = positionManagerRaw ? ethers.getAddress(positionManagerRaw) : ethers.ZeroAddress; // <<< ADDED
export const TOKEN_A_ADDRESS = token0Raw ? ethers.getAddress(token0Raw) : ethers.ZeroAddress; // Renaming for consistency if needed
export const TOKEN_B_ADDRESS = token1Raw ? ethers.getAddress(token1Raw) : ethers.ZeroAddress; // Renaming for consistency if needed
export const TOKEN_C_ADDRESS = token2Raw ? ethers.getAddress(token2Raw) : ethers.ZeroAddress; // Renaming for consistency if needed
export const GOVERNANCE_TOKEN_ADDRESS = governanceTokenRaw ? ethers.getAddress(governanceTokenRaw) : ethers.ZeroAddress;
export const GOVERNANCE_CONTRACT_ADDRESS = governanceContractRaw ? ethers.getAddress(governanceContractRaw) : ethers.ZeroAddress;

// --- Pool Configuration (Verify from your deployment/protocol spec) ---
export const POOL_TICK_SPACING = 64; // <<< Verify this value (e.g., 10, 60, 200)
export const DYNAMIC_FEE_FLAG = 0x800000; // <<< Verify if using dynamic fees

export const DEFAULT_BASE_FEE_PER_TICK = 30; // uint24 (pips per tick spacing unit)
export const DEFAULT_HOOK_FEE = 25;

// --- Network Configuration ---
export const TARGET_NETWORK_CHAIN_ID = 31337n // Example: Anvil Localhost Chain ID
export const TARGET_NETWORK_NAME = "Anvil Localhost";
export const EXPLORER_URL_BASE = null; // No explorer for local Anvil

// --- Other Constants ---
// List of tokens to fetch balances for (add more as needed)
export const RELEVANT_TOKEN_ADDRESSES = [
    TOKEN_A_ADDRESS,
    TOKEN_B_ADDRESS,
    TOKEN_C_ADDRESS,
    GOVERNANCE_TOKEN_ADDRESS,
].filter(addr => addr !== ethers.ZeroAddress);