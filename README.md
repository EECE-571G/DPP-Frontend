# Desired Price Pool - Frontend

This repository contains the source code for the frontend application of the Desired Price Pool project. It's a React application built with TypeScript, utilizing Material UI for components and ethers.js (v6) for blockchain interactions.

The application provides a user interface for interacting with a decentralized finance (DeFi) system based on the "Desired Price Pool" concept.

## Features

*   **Wallet Connection:** Connects to user's Ethereum wallet using MetaMask.
*   **Dashboard:**
    *   Select active Desired Price Pool.
    *   View user token balances for the selected pool.
    *   Inspect liquidity details for a given Position NFT Token ID.
*   **Swap:** Perform token swaps within the selected pool. Includes price estimation.
*   **Liquidity Management:**
    *   **Mint:** Create new liquidity positions (NFTs) with specified price ranges (ticks) and liquidity amounts.
    *   **Add:** Increase liquidity for an existing position NFT.
    *   **Remove:** Decrease liquidity from an existing position NFT.
*   **Rewards:**
    *   Calculate estimated rewards accrued to a liquidity position NFT.
    *   Collect accrued rewards.
    *   Includes a 1-day lock period for reward collection.
*   **Governance:**
    *   View the current desired price and poll status for the selected pool (fetched from contract state).
    *   Visualize vote distribution 
    *   Cast votes within a tick range 
    *   Delegate voting power
*   **Time Simulation:** Controls (visible when connected to a local Anvil node) to advance the displayed block timestamp for testing time-dependent features.
*   **Theme Toggle:** Switch between light and dark modes.
*   **Responsive Layout:** Adapts to different screen sizes.

## Tech Stack

*   **Framework:** React 18
*   **Language:** TypeScript
*   **UI Library:** Material UI (MUI) v5
*   **Routing:** React Router v6
*   **Blockchain Interaction:** ethers.js v6
*   **State Management:** React Context API
*   **Build Tool:** Create React App

## Architecture Overview

The application heavily relies on the **React Context API** for managing and distributing application state. Key contexts include:

*   **`AuthProvider`**: Manages wallet connection state (provider, signer, account, network), connection logic, and error handling. Essential for all blockchain interactions.
*   **`BalancesProvider`**: Fetches and stores user token balances, symbols, and decimals for relevant tokens. Depends on `AuthProvider`.
*   **`TimeProvider`**: Manages the block timestamp used throughout the app. Can use the latest block timestamp or a simulated one advanced manually via `AnvilTimeControls`. Depends on `AuthProvider`.
*   **`PoolsProvider`**: Fetches metadata about available pools (like desired price tick, fee rates) primarily from the *Hook* contract (`DesiredPricePool.sol`). Derives `poolId`. Depends on `AuthProvider` and `BalancesProvider`.
*   **`GovernanceProvider`**: Manages governance-related data. It fetches metadata like the current desired price tick but uses data for poll state (ID, start time, flags, vote distribution). It calculates derived poll status based on the start time and the potentially simulated time from `TimeProvider`. Depends on `AuthProvider`, `PoolsProvider`, and `TimeProvider`.
*   **`AppProvider`**: Handles global UI concerns like theme mode and navigation structure.
*   **`LoadingProvider`**: Manages loading states for various asynchronous actions (e.g., `swap`, `addLiquidity`, `approve_...`).
*   **`SnackbarProvider`**: Provides a global system for displaying notification messages (toasts).

**Component Structure:**

*   **`components/`**: Contains reusable UI elements and feature-specific components (e.g., `Swap.tsx`, `Liquidity.tsx`, `Governance/`).
*   **`contexts/`**: Holds all the React Context providers described above.
*   **`hooks/`**: Encapsulates reusable logic, especially for blockchain interactions (`useSwapActions`, `useLiquidityActions`, `useRewardActions`) and complex state logic (`useSwapEstimate`, `useGovernanceActions`).
*   **`layout/`**: Defines the main application layout (`DashboardLayout.tsx`) including the AppBar and Sidebar.
*   **`types/`**: Contains TypeScript type definitions and interfaces.
*   **`utils/`**: Provides utility functions for formatting, interacting with `localStorage`, and tick/price calculations (`tickMath.ts`).
*   **`constants/`**: Stores crucial configuration like contract addresses, network IDs, and ABI imports.

**Blockchain Interaction Pattern:**

*   Most write operations (Swap, Mint, Add/Remove Liquidity, Collect Rewards) interact with a **Helper Contract** (`DesiredPricePoolHelper.sol`) or the **Hook Contract** (`DesiredPricePool.sol`), not directly with the Pool Manager or individual pool contracts.
*   Approvals are handled within the action hooks (`useSwapActions`, `useLiquidityActions`) and target the relevant contract (usually the Helper).
*   Read operations fetch data directly from contracts (`BalancesProvider`, `PoolsProvider` partly)

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   MetaMask browser extension
*   A local blockchain environment (like Anvil or Hardhat Network) where the corresponding Desired Price Pool contracts are deployed.

### Installation

1.  Clone the repository:
    ```bash
    git clone <your-repo-url>
    cd desired-price-pool-frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

### Configuration

3.  **Crucially, update the contract addresses and network configuration:**
    *   Open `src/constants/index.js`.
    *   Replace the placeholder addresses (e.g., `poolManagerRaw`, `desiredPricePoolHookRaw`, `token0Raw`, etc.) with the **actual addresses** obtained after deploying your contracts to your local blockchain environment (Anvil/Hardhat).
    *   Verify `TARGET_NETWORK_CHAIN_ID` matches your local network's Chain ID (Anvil default is 31337).
    *   Verify `POOL_TICK_SPACING` and fee constants match your deployment.

### Running the App

4.  Ensure your local blockchain (Anvil/Hardhat) is running with the contracts deployed.
5.  Start the React development server:
    ```bash
    npm start
    # or
    yarn start
    ```
6.  Open your browser to `http://localhost:3000` (or the specified port).
7.  Connect MetaMask and ensure it's configured for your local network (e.g., `http://localhost:8545` with the correct Chain ID). Import an account that has funds (ETH and deployed tokens) on your local network.
