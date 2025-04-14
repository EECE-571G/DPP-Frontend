// src/constants/index.js
import { ethers } from 'ethers';

// --- Configuration (!!! REPLACE WITH YOUR ACTUAL DEPLOYMENT DATA !!!) ---

const poolManagerRaw = "0x68B1D87F95878fE05B998F19b66F4baba5De1aed"; // <<< FROM LOGS
const desiredPricePoolHookRaw = "0x6Ed1c39731aF9BB23f95f296406048E5b6f0aac4"; // <<< FROM LOGS
const desiredPricePoolHelperRaw = "0xC7f2Cf4845C6db0e1a1e91ED41Bcd0FcC1b0E141";
const positionManagerRaw = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c"; // <<< FROM LOGS (Example, check your Anvil output)
const token0Raw = "0x59b670e9fA9D0A427751Af201D676719a970857b";        // <<< FROM LOGS (Token0)
const token1Raw = "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1";        // <<< FROM LOGS (Token1)
const governanceTokenRaw = null;     // <<< REPLACE (Your vDPP or equivalent)
const governanceContractRaw = desiredPricePoolHookRaw; // <<< REPLACE (If you have one)

// Export checksummed addresses
export const POOL_MANAGER_ADDRESS = poolManagerRaw ? ethers.getAddress(poolManagerRaw) : ethers.ZeroAddress;
export const DESIRED_PRICE_POOL_HOOK_ADDRESS = desiredPricePoolHookRaw ? ethers.getAddress(desiredPricePoolHookRaw) : ethers.ZeroAddress; // Use ZeroAddress if no hook or standard hook
export const DESIRED_PRICE_POOL_HELPER_ADDRESS = desiredPricePoolHelperRaw ? ethers.getAddress(desiredPricePoolHelperRaw) : ethers.ZeroAddress;
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