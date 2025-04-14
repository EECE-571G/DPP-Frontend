// src/constants/index.js
import { ethers } from 'ethers';

// --- Configuration (!!! REPLACE WITH YOUR ACTUAL DEPLOYMENT DATA !!!) ---

const poolManagerRaw = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // <<< FROM LOGS
const desiredPricePoolHookRaw = "0xF67ad5543c15c99DD76D66a1dd7D0C6594B56Ac4"; // <<< FROM LOGS
const positionManagerRaw = "0x4A679253410272dd5232B3Ff7cF5dbB88f295319"; // <<< FROM LOGS (Example, check your Anvil output)
const token0Raw = "0x0165878A594ca255338adfa4d48449f69242Eb8F";        // <<< FROM LOGS (Token0)
const token1Raw = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";        // <<< FROM LOGS (Token1)
const governanceTokenRaw = null;     // <<< REPLACE (Your vDPP or equivalent)
const governanceContractRaw = desiredPricePoolHookRaw; // <<< REPLACE (If you have one)

// Export checksummed addresses
export const POOL_MANAGER_ADDRESS = poolManagerRaw ? ethers.getAddress(poolManagerRaw) : ethers.ZeroAddress;
export const DESIRED_PRICE_POOL_HOOK_ADDRESS = desiredPricePoolHookRaw ? ethers.getAddress(desiredPricePoolHookRaw) : ethers.ZeroAddress; // Use ZeroAddress if no hook or standard hook
export const POSITION_MANAGER_ADDRESS = positionManagerRaw ? ethers.getAddress(positionManagerRaw) : ethers.ZeroAddress; // <<< ADDED
export const TOKEN_A_ADDRESS = token0Raw ? ethers.getAddress(token0Raw) : ethers.ZeroAddress; // Renaming for consistency if needed
export const TOKEN_B_ADDRESS = token1Raw ? ethers.getAddress(token1Raw) : ethers.ZeroAddress; // Renaming for consistency if needed
export const GOVERNANCE_TOKEN_ADDRESS = governanceTokenRaw ? ethers.getAddress(governanceTokenRaw) : ethers.ZeroAddress;
export const GOVERNANCE_CONTRACT_ADDRESS = governanceContractRaw ? ethers.getAddress(governanceContractRaw) : ethers.ZeroAddress;

// --- Pool Configuration (Verify from your deployment/protocol spec) ---
export const POOL_TICK_SPACING = 64; // <<< Verify this value (e.g., 10, 60, 200)
export const DYNAMIC_FEE_FLAG = 0x800000; // <<< Verify if using dynamic fees

// --- Network Configuration (!!! CHOOSE YOUR TARGET NETWORK !!!) ---
export const TARGET_NETWORK_CHAIN_ID = 31337n // Example: Anvil Localhost Chain ID
export const TARGET_NETWORK_NAME = "Anvil Localhost";
export const EXPLORER_URL_BASE = null; // No explorer for local Anvil

// --- Other Constants ---
// List of tokens to fetch balances for (add more as needed)
export const RELEVANT_TOKEN_ADDRESSES = [
    TOKEN_A_ADDRESS,
    TOKEN_B_ADDRESS,
    GOVERNANCE_TOKEN_ADDRESS,
    // Add WETH address for the target network if not Token A/B
    // "0x...", // WETH Address for TARGET_NETWORK
].filter(addr => addr !== ethers.ZeroAddress); // Filter out zero addresses

// --- ABIs (Make sure these paths are correct) ---
// It's often better to import ABIs directly where needed,
// but exporting them here can work if preferred.
// import PoolManagerABI from '../abis/IPoolManager.json';
// import Erc20ABI from '../abis/ERC20.json';
// export { PoolManagerABI, Erc20ABI };