// src/hooks/useLiquidityActions.ts
import { useCallback } from 'react';
import { ethers, parseUnits, MaxUint256, ZeroAddress, isAddress, Contract, randomBytes } from 'ethers'; // Ethers v6 imports
import { useAuthContext } from '../contexts/AuthContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { usePoolsContext } from '../contexts/PoolsContext';
import { POOL_MANAGER_ADDRESS, EXPLORER_URL_BASE, TARGET_NETWORK_CHAIN_ID } from '../constants';
import PoolManagerABI from '../abis/IPoolManager.json';
import Erc20ABI from '../abis/ERC20.json';
// IMPORTANT: V4 liquidity might involve PositionManager or specific hook ABIs

// Define TickMath constants (replace with import if available or use actual values)
const MIN_TICK = -887272;
const MAX_TICK = 887272;

// Make sure the hook function itself is exported correctly
export const useLiquidityActions = () => {
    const { signer, account, network } = useAuthContext();
    const { fetchBalances, tokenDecimals, tokenSymbols } = useBalancesContext();
    const { setLoading } = useLoadingContext();
    const { showSnackbar } = useSnackbarContext();
    const { selectedPool } = usePoolsContext();

    const checkAndRequestApproval = useCallback(async (tokenAddress: string, amountWei: bigint): Promise<boolean> => {
        if (!signer || !account || !tokenAddress ) { // Allow 0 amount check? No, approval needs amount > 0
            console.error("Approval check prerequisites failed");
             return false;
        }
         if (POOL_MANAGER_ADDRESS === ZeroAddress) {
            showSnackbar("Pool Manager address not configured for approval.", "error");
            return false;
         }

        // Skip approval request for 0 amount, but return true as no approval is needed
        if (amountWei <= 0n) return true;

        try {
            const tokenContract = new Contract(tokenAddress, Erc20ABI, signer);
            const currentAllowance = await tokenContract.allowance(account, POOL_MANAGER_ADDRESS);

            if (currentAllowance >= amountWei) {
                console.log(`Allowance sufficient for ${tokenAddress}`);
                return true;
            }

            const symbol = tokenSymbols[tokenAddress] ?? 'token';
            showSnackbar(`Approval required for ${symbol}. Please confirm in wallet.`, 'info');
            setLoading(`approve_${tokenAddress}`, true);

            // Using MaxUint256 is generally recommended for liquidity management for convenience
            const tx = await tokenContract.approve(POOL_MANAGER_ADDRESS, MaxUint256);

            let message = `Approval transaction submitted`;
            if (EXPLORER_URL_BASE) {
                 message = `${message}. Waiting...`;
            } else {
                 message = `${message}: ${tx.hash}. Waiting...`;
            }
             showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                showSnackbar('Approval successful!', 'success');
                return true;
            } else {
                throw new Error('Approval transaction failed.');
            }
        } catch (error: any) {
            console.error(`Approval failed for ${tokenAddress}:`, error);
            const message = error?.reason || error?.data?.message || error.message || "Approval failed.";
            showSnackbar(`Approval failed: ${message}`, 'error');
            return false;
        } finally {
             setLoading(`approve_${tokenAddress}`, false);
        }
    }, [signer, account, tokenSymbols, showSnackbar, setLoading]); // Dependencies

    const handleAddLiquidity = useCallback(async (amountA: number, amountB: number): Promise<boolean> => {
        if (!signer || !account || !selectedPool?.poolKey || !selectedPool.tokenA_Address || !selectedPool.tokenB_Address || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot add liquidity: Wallet/Pool/Network issue.', 'error'); return false;
        }
         if (amountA <= 0 || amountB <= 0) {
            showSnackbar('Both token amounts must be positive to add liquidity.', 'warning'); return false;
         }
          if (POOL_MANAGER_ADDRESS === ZeroAddress) {
            showSnackbar("Pool Manager address not configured.", "error"); return false;
          }

        const { poolKey, tokenA_Address, tokenB_Address } = selectedPool;
        const decimalsA = tokenDecimals[tokenA_Address] ?? 18;
        const decimalsB = tokenDecimals[tokenB_Address] ?? 18;

        try {
            const amountAWei = parseUnits(amountA.toString(), decimalsA);
            const amountBWei = parseUnits(amountB.toString(), decimalsB);

            setLoading('approve_liquidity', true);
            const approvedA = await checkAndRequestApproval(tokenA_Address, amountAWei);
            const approvedB = await checkAndRequestApproval(tokenB_Address, amountBWei);
            setLoading('approve_liquidity', false);
            if (!approvedA || !approvedB) {
                 showSnackbar('One or more approvals failed or were rejected.', 'error');
                 return false;
             }

             setLoading('addLiquidity', true);
             showSnackbar('Preparing add liquidity transaction...', 'info');

             // <<< IMPORTANT: Placeholder Delta Calculation >>>
             // This requires the Uniswap V4 SDK or equivalent math.
             // You need pool's current sqrtRatioX96 and tick to calculate this correctly.
             console.warn("Using PLACEHOLDER liquidityDelta calculation. Replace with actual V4 SDK/math.");
             const placeholderLiquidityDelta = parseUnits("1", 6); // Adjust units based on typical liquidity magnitude

             const params = {
                 tickLower: MIN_TICK,
                 tickUpper: MAX_TICK,
                 liquidityDelta: placeholderLiquidityDelta,
                 salt: randomBytes(32) // Use Ethers v6 randomBytes
             };
             const hookData = '0x';
             const poolManager = new Contract(POOL_MANAGER_ADDRESS, PoolManagerABI, signer);

             console.log("Submitting modifyLiquidity (Add) tx with key:", poolKey, "params:", params);
             const tx = await poolManager.modifyLiquidity(poolKey, params, hookData);

             let message = `Add Liquidity tx submitted`;
              if (EXPLORER_URL_BASE) {
                  message = `${message}. Waiting for confirmation...`;
              } else {
                  message = `${message}: ${tx.hash}. Waiting...`;
              }
             showSnackbar(message, 'info');

             const receipt = await tx.wait(1);
             if (receipt?.status === 1) {
                 let successMessage = 'Liquidity added successfully!';
                 showSnackbar(successMessage, 'success');
                 await fetchBalances();
                 return true;
             } else {
                 throw new Error('Add liquidity transaction failed.');
             }

        } catch (error: any) {
             console.error("Add Liquidity Error:", error);
             const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Add liquidity failed.";
             showSnackbar(`Add Liquidity failed: ${reason}`, 'error');
             return false;
        } finally {
             setLoading('addLiquidity', false);
             setLoading('approve_liquidity', false);
        }
    }, [signer, account, network, selectedPool, tokenDecimals, checkAndRequestApproval, fetchBalances, setLoading, showSnackbar]); // Added dependencies

    // --- Remove Liquidity ---
    const handleRemoveLiquidity = useCallback(async (liquidityDeltaToRemove: bigint): Promise<boolean> => {
        if (!signer || !account || !selectedPool?.poolKey || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot remove liquidity: Wallet/Pool/Network issue.', 'error'); return false;
        }
         if (liquidityDeltaToRemove <= 0n) {
            showSnackbar('Amount of liquidity to remove must be positive.', 'warning'); return false;
         }
          if (POOL_MANAGER_ADDRESS === ZeroAddress) {
            showSnackbar("Pool Manager address not configured.", "error"); return false;
          }

        const { poolKey } = selectedPool;

       try {
            setLoading('removeLiquidity', true);
            showSnackbar('Preparing remove liquidity transaction...', 'info');

            const params = {
                tickLower: MIN_TICK,
                tickUpper: MAX_TICK,
                liquidityDelta: -liquidityDeltaToRemove, // Negative delta
                salt: randomBytes(32) // Ethers v6
            };
            const hookData = '0x';
            const poolManager = new Contract(POOL_MANAGER_ADDRESS, PoolManagerABI, signer);

            console.log("Submitting modifyLiquidity (Remove) tx with key:", poolKey, "params:", params);
            const tx = await poolManager.modifyLiquidity(poolKey, params, hookData);

             let message = `Remove Liquidity tx submitted`;
              if (EXPLORER_URL_BASE) {
                  message = `${message}. Waiting for confirmation...`;
              } else {
                  message = `${message}: ${tx.hash}. Waiting...`;
              }
            showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            // REMINDER: A separate `collect` call might be necessary in V4.
            if (receipt?.status === 1) {
                let successMessage = 'Liquidity removal initiated! (Collect tokens separately if needed)';
                showSnackbar(successMessage, 'success');
                await fetchBalances();
                return true;
            } else {
                throw new Error('Remove liquidity transaction failed.');
            }

       } catch (error: any) {
            console.error("Remove Liquidity Error:", error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Remove liquidity failed.";
            showSnackbar(`Remove Liquidity failed: ${reason}`, 'error');
            return false;
       } finally {
            setLoading('removeLiquidity', false);
       }
    }, [signer, account, network, selectedPool, fetchBalances, setLoading, showSnackbar]);


    return { handleAddLiquidity, handleRemoveLiquidity, checkAndRequestApproval };
};