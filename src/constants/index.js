// src/constants/index.js
import { ethers } from 'ethers';

// --- Configuration (!!! REPLACE WITH YOUR ACTUAL DEPLOYMENT DATA !!!) ---

const poolManagerRaw = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // <<< FROM LOGS
const desiredPricePoolHookRaw = "0x7C0931F9df3C8A50B16BfFAfc893DC802Ee9AaC4"; // <<< FROM LOGS
const desiredPricePoolHelperRaw = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const positionManagerRaw = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // <<< FROM LOGS (Example, check your Anvil output)
const token0Raw = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";        // <<< FROM LOGS (Token0)
const token1Raw = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";        // <<< FROM LOGS (Token1)
const token2Raw = "0x0165878A594ca255338adfa4d48449f69242Eb8F";        // <<< FROM LOGS (Token2)
const governanceTokenRaw = "0x800cAFaACC4991e415BFec4488d49D302C4DB13C";     // <<< REPLACE (Your vDPP or equivalent)
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

// --- Network Configuration (!!! CHOOSE YOUR TARGET NETWORK !!!) ---
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
    // Add WETH address for the target network if not Token A/B
    // "0x...", // WETH Address for TARGET_NETWORK
].filter(addr => addr !== ethers.ZeroAddress); // Filter out zero addresses

// --- ABIs (Make sure these paths are correct) ---
// It's often better to import ABIs directly where needed,
// but exporting them here can work if preferred.
// import PoolManagerABI from '../abis/IPoolManager.json';
// import Erc20ABI from '../abis/ERC20.json';
// export { PoolManagerABI, Erc20ABI };