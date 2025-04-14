// src/hooks/useLiquidityActions.ts
import { useCallback } from 'react';
import { ethers, parseUnits, MaxUint256, ZeroAddress, isAddress, Contract, AbiCoder } from 'ethers';
import { useAuthContext } from '../contexts/AuthContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { usePoolsContext } from '../contexts/PoolsContext';
import {
    POSITION_MANAGER_ADDRESS,
    EXPLORER_URL_BASE,
    TARGET_NETWORK_CHAIN_ID,
} from '../constants';
// ABIs
import PositionManagerABI from '../abis/PositionManager.json';
import Erc20ABI from '../abis/ERC20.json';

// Define TickMath constants (replace with import if available or use actual values)
const MIN_TICK = -887272;
const MAX_TICK = 887272;

// Local storage keys
const LS_TOKEN_ID = 'liquidity_tokenId';
const LS_LOWER_TICK = 'liquidity_lowerTick';
const LS_UPPER_TICK = 'liquidity_upperTick';

// Define Action Code (check Actions.sol or ABI if different)
const MINT_POSITION_ACTION = 3;
const INCREASE_LIQUIDITY_ACTION = 0;
const DECREASE_LIQUIDITY_ACTION = 2;

// Define MaxUint128 constant
const MAX_UINT128 = 2n ** 128n - 1n;

export const useLiquidityActions = () => {
    const { signer, account, network } = useAuthContext();
    const { fetchBalances, tokenDecimals, tokenSymbols } = useBalancesContext();
    const { setLoading } = useLoadingContext();
    const { showSnackbar } = useSnackbarContext();
    const { selectedPool } = usePoolsContext();

    // Approval check still targets PositionManager
    const checkAndRequestApproval = useCallback(async (tokenAddress: string): Promise<boolean> => {
        // ... (implementation remains the same) ...
         if (!signer || !account || !tokenAddress || !isAddress(tokenAddress) || tokenAddress === ZeroAddress) {
            console.error("Approval check prerequisites failed (signer, account, tokenAddress)");
            return false;
        }
        if (POSITION_MANAGER_ADDRESS === ZeroAddress) {
            showSnackbar("Position Manager address not configured for approval.", "error");
            return false;
        }

        try {
            const tokenContract = new Contract(tokenAddress, Erc20ABI, signer);
            const currentAllowance = await tokenContract.allowance(account, POSITION_MANAGER_ADDRESS);

            if (currentAllowance >= MaxUint256 / 2n) {
                console.log(`Allowance sufficient for ${tokenAddress}`);
                return true;
            }

            const symbol = tokenSymbols[tokenAddress] ?? 'token';
            showSnackbar(`Max approval required for ${symbol} by Position Manager. Please confirm.`, 'info');
            setLoading(`approve_${tokenAddress}_posm`, true);

            const tx = await tokenContract.approve(POSITION_MANAGER_ADDRESS, MaxUint256);

            let message = `Approval transaction submitted`;
            if (EXPLORER_URL_BASE) {
                 message = `${message}. Waiting...`;
            } else {
                 message = `${message}: ${tx.hash}. Waiting...`;
             }
             showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                showSnackbar('Max approval successful!', 'success');
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
             setLoading(`approve_${tokenAddress}_posm`, false);
        }
    }, [signer, account, tokenSymbols, showSnackbar, setLoading]);

    // --- Mint New Position ---
    const handleMintPosition = useCallback(async (lowerTick: number, upperTick: number, liquidityStr: string): Promise<boolean> => {
        // ... (initial checks remain the same) ...
        if (!signer || !account || !selectedPool?.poolKey || !selectedPool.tokenA_Address || !selectedPool.tokenB_Address || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot mint: Wallet/Pool/Network issue.', 'error'); return false;
        }
        if (POSITION_MANAGER_ADDRESS === ZeroAddress) {
            showSnackbar("Position Manager address not configured.", "error"); return false;
        }
        if (lowerTick >= upperTick) {
            showSnackbar("Lower tick must be less than upper tick.", "warning"); return false;
        }

        let liquidityWei: bigint;
        try {
            // Parse as uint256, but still check if it exceeds uint128 conceptually
            const parsedLiq = parseUnits(liquidityStr, 0);
            if (parsedLiq > MAX_UINT128) {
                 console.warn("Warning: Liquidity amount exceeds uint128, but encoding as uint256.");
                 // You might still want to throw an error here depending on expected behavior
                 // throw new Error("Liquidity amount exceeds uint128 max.");
            }
            liquidityWei = parsedLiq;
            if (liquidityWei <= 0n) {
                showSnackbar('Liquidity amount must be positive.', 'warning'); return false;
            }
        } catch (e: any) {
             showSnackbar(`Invalid liquidity amount entered: ${e.message}`, 'error'); return false;
        }

        const { poolKey, tokenA_Address, tokenB_Address } = selectedPool;

        try {
            setLoading('mintPosition_approve', true);
            const approvedA = await checkAndRequestApproval(tokenA_Address);
            const approvedB = await checkAndRequestApproval(tokenB_Address);
            setLoading('mintPosition_approve', false);
            if (!approvedA || !approvedB) {
                 showSnackbar('One or more approvals failed or were rejected.', 'error');
                 return false;
             }

             setLoading('mintPosition', true);
             showSnackbar('Preparing mint position transaction...', 'info');

            const positionManager = new Contract(POSITION_MANAGER_ADDRESS, PositionManagerABI, signer);

            // --- Encode parameters for MINT_POSITION ---
             const mintParams = [
                poolKey,
                lowerTick,
                upperTick,
                liquidityWei, // Pass the bigint value
                0, // amount0Max (uint128)
                0, // amount1Max (uint128)
                account, // recipient
                "0x" // hookData
             ];
             const mintParamTypes = [
                'tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)',
                'int24',   // tickLower
                'int24',   // tickUpper
                'uint256', // liquidity
                'uint128', // amount0Max
                'uint128', // amount1Max
                'address', // owner
                'bytes'    // hookData
             ];

            const encodedMintParams = AbiCoder.defaultAbiCoder().encode(mintParamTypes, mintParams);
            const actionsBytes = ethers.toBeHex(MINT_POSITION_ACTION);
            const paramsArray = [encodedMintParams];

            console.log("Submitting modifyLiquiditiesWithoutUnlock (Mint) tx with actions:", actionsBytes, "params:", paramsArray, "decoded mint params:", mintParams);

            const tx = await positionManager.modifyLiquiditiesWithoutUnlock(actionsBytes, paramsArray);

            // ... (rest of the transaction handling and event parsing remains the same) ...
             let message = `Mint Position tx submitted`;
            if (EXPLORER_URL_BASE) {
                 message = `${message}. Waiting for confirmation...`;
             } else {
                 message = `${message}: ${tx.hash}. Waiting...`;
             }
            showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                let mintedTokenId = "Unknown";
                const erc721Interface = new ethers.Interface([
                    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
                ]);
                 if (receipt.logs) {
                    for (const log of receipt.logs) {
                         try {
                            if (log.address.toLowerCase() === POSITION_MANAGER_ADDRESS.toLowerCase()) {
                                const parsedLog = erc721Interface.parseLog(log);
                                if (parsedLog && parsedLog.name === "Transfer" && parsedLog.args.from === ZeroAddress) {
                                    mintedTokenId = parsedLog.args.tokenId.toString();
                                    localStorage.setItem(LS_TOKEN_ID, mintedTokenId);
                                    console.log("Minted Token ID found and saved:", mintedTokenId);
                                    break;
                                }
                            }
                         } catch (parseError) { /* ignore */ }
                    }
                 }
                showSnackbar(`Position minted successfully! Token ID: ${mintedTokenId}`, 'success');
                await fetchBalances();
                return true;
            } else {
                throw new Error('Mint position transaction failed.');
            }

        } catch (error: any) {
             console.error("Mint Position Error:", error);
             const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Mint position failed.";
             showSnackbar(`Mint Position failed: ${reason}`, 'error');
             return false;
        } finally {
             setLoading('mintPosition', false);
             setLoading('mintPosition_approve', false);
        }
    }, [signer, account, network, selectedPool, checkAndRequestApproval, fetchBalances, setLoading, showSnackbar]);

    // --- Add Liquidity to Existing Position ---
    const handleAddLiquidity = useCallback(async (tokenIdStr: string, liquidityStr: string): Promise<boolean> => {
       // ... (initial checks remain the same) ...
        if (!signer || !account || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot add liquidity: Wallet/Network issue.', 'error'); return false;
        }
        if (POSITION_MANAGER_ADDRESS === ZeroAddress) {
            showSnackbar("Position Manager address not configured.", "error"); return false;
        }

        let tokenId: bigint;
        let liquidityWei: bigint;
        try {
            tokenId = BigInt(tokenIdStr);
            if (tokenId <= 0n) throw new Error("Invalid Token ID");
            const parsedLiq = parseUnits(liquidityStr, 0);
            if (parsedLiq > MAX_UINT128) {
                 throw new Error("Liquidity amount exceeds uint128 max.");
            }
            liquidityWei = parsedLiq;
            if (liquidityWei <= 0n) {
                showSnackbar('Liquidity amount must be positive.', 'warning'); return false;
            }
        } catch (e: any) {
            showSnackbar(`Invalid Token ID or Liquidity amount: ${e.message}`, 'error'); return false;
        }
        if (!selectedPool?.tokenA_Address || !selectedPool?.tokenB_Address) {
             showSnackbar('Pool details missing, cannot determine tokens for approval.', 'error');
             return false;
        }
        const { tokenA_Address, tokenB_Address } = selectedPool;


        try {
             setLoading(`addLiquidity_approve_${tokenId}`, true);
             const approvedA = await checkAndRequestApproval(tokenA_Address);
             const approvedB = await checkAndRequestApproval(tokenB_Address);
             setLoading(`addLiquidity_approve_${tokenId}`, false);
             if (!approvedA || !approvedB) {
                  showSnackbar('One or more approvals failed or were rejected.', 'error');
                  return false;
              }

            setLoading(`addLiquidity_${tokenId}`, true);
            showSnackbar(`Preparing to add liquidity to token ${tokenIdStr}...`, 'info');

            const positionManager = new Contract(POSITION_MANAGER_ADDRESS, PositionManagerABI, signer);

            // --- Encode parameters for INCREASE_LIQUIDITY ---
            // decodeModifyLiquidityParams expects: (uint256 tokenId, uint256 liquidity, uint128 amount0, uint128 amount1, bytes hookData)
             const increaseParams = [
                tokenId,
                liquidityWei, // liquidity (pass bigint)
                0, // amount0Max (uint128) - Renamed from decodeModifyLiquidityParams
                0, // amount1Max (uint128) - Renamed from decodeModifyLiquidityParams
                "0x" // hookData
             ];
             const increaseParamTypes = [
                'uint256', // tokenId
                'uint256', // liquidity (Matches decodeModifyLiquidityParams)
                'uint128', // amount0Max (Assuming this maps to amount0 in decoder)
                'uint128', // amount1Max (Assuming this maps to amount1 in decoder)
                'bytes'    // hookData
             ];
            const encodedIncreaseParams = AbiCoder.defaultAbiCoder().encode(increaseParamTypes, increaseParams);

            const actionsBytes = ethers.toBeHex(INCREASE_LIQUIDITY_ACTION);
            const paramsArray = [encodedIncreaseParams];

            console.log(`Submitting modifyLiquiditiesWithoutUnlock (Add) for token ${tokenIdStr} with actions:`, actionsBytes, "params:", paramsArray, "decoded increase params:", increaseParams);

            const tx = await positionManager.modifyLiquiditiesWithoutUnlock(actionsBytes, paramsArray);

            // ... (rest of the transaction handling remains the same) ...
             let message = `Add Liquidity tx submitted for token ${tokenIdStr}`;
             if (EXPLORER_URL_BASE) {
                 message = `${message}. Waiting for confirmation...`;
             } else {
                 message = `${message}: ${tx.hash}. Waiting...`;
             }
            showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                showSnackbar(`Liquidity added successfully to token ${tokenIdStr}!`, 'success');
                await fetchBalances();
                return true;
            } else {
                throw new Error('Add liquidity transaction failed.');
            }

        } catch (error: any) {
            console.error(`Add Liquidity Error for token ${tokenIdStr}:`, error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Add liquidity failed.";
            showSnackbar(`Add Liquidity failed: ${reason}`, 'error');
            return false;
        } finally {
            setLoading(`addLiquidity_${tokenId}`, false);
            setLoading(`addLiquidity_approve_${tokenId}`, false);
        }
    }, [signer, account, network, selectedPool, checkAndRequestApproval, fetchBalances, setLoading, showSnackbar]);


    // --- Remove Liquidity from Existing Position ---
    const handleRemoveLiquidity = useCallback(async (tokenIdStr: string, liquidityStr: string): Promise<boolean> => {
        // ... (initial checks remain the same) ...
         if (!signer || !account || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot remove liquidity: Wallet/Network issue.', 'error'); return false;
        }
        if (POSITION_MANAGER_ADDRESS === ZeroAddress) {
            showSnackbar("Position Manager address not configured.", "error"); return false;
        }

         let tokenId: bigint;
         let liquidityWei: bigint;
         try {
             tokenId = BigInt(tokenIdStr);
             if (tokenId <= 0n) throw new Error("Invalid Token ID");
             const parsedLiq = parseUnits(liquidityStr, 0);
              if (parsedLiq > MAX_UINT128) {
                  throw new Error("Liquidity amount exceeds uint128 max.");
              }
              liquidityWei = parsedLiq;
             if (liquidityWei <= 0n) {
                 showSnackbar('Liquidity amount to remove must be positive.', 'warning'); return false;
             }
         } catch (e: any) {
              showSnackbar(`Invalid Token ID or Liquidity amount: ${e.message}`, 'error'); return false;
         }

       try {
            setLoading(`removeLiquidity_${tokenId}`, true);
            showSnackbar(`Preparing to remove liquidity from token ${tokenIdStr}...`, 'info');

            const positionManager = new Contract(POSITION_MANAGER_ADDRESS, PositionManagerABI, signer);

            // --- Encode parameters for DECREASE_LIQUIDITY ---
            // decodeModifyLiquidityParams expects: (uint256 tokenId, uint256 liquidity, uint128 amount0, uint128 amount1, bytes hookData)
             const decreaseParams = [
                 tokenId,
                 liquidityWei, // liquidity (bigint)
                 0, // amount0Min (uint128)
                 0, // amount1Min (uint128)
                 "0x" // hookData
                ];
             const decreaseParamTypes = [
                 'uint256', // tokenId
                 'uint256', // liquidity (Matches decodeModifyLiquidityParams)
                 'uint128', // amount0Min (Assuming this maps to amount0)
                 'uint128', // amount1Min (Assuming this maps to amount1)
                 'bytes'    // hookData
             ];
            const encodedDecreaseParams = AbiCoder.defaultAbiCoder().encode(decreaseParamTypes, decreaseParams);

            const actionsBytes = ethers.toBeHex(DECREASE_LIQUIDITY_ACTION);
            const paramsArray = [encodedDecreaseParams];


            console.log(`Submitting modifyLiquiditiesWithoutUnlock (Remove) for token ${tokenIdStr} with actions:`, actionsBytes, "params:", paramsArray, "decoded decrease params:", decreaseParams);

            const tx = await positionManager.modifyLiquiditiesWithoutUnlock(actionsBytes, paramsArray);

            // ... (rest of the transaction handling remains the same) ...
             let message = `Remove Liquidity tx submitted for token ${tokenIdStr}`;
             if (EXPLORER_URL_BASE) {
                 message = `${message}. Waiting for confirmation...`;
             } else {
                 message = `${message}: ${tx.hash}. Waiting...`;
             }
            showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                showSnackbar(`Liquidity removal initiated for token ${tokenIdStr}! Collect fees/tokens separately if needed.`, 'success');
                await fetchBalances(); // Refresh token balances
                return true;
            } else {
                throw new Error('Remove liquidity transaction failed.');
            }

       } catch (error: any) {
            console.error(`Remove Liquidity Error for token ${tokenIdStr}:`, error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Remove liquidity failed.";
            showSnackbar(`Remove Liquidity failed: ${reason}`, 'error');
            return false;
       } finally {
            setLoading(`removeLiquidity_${tokenId}`, false);
       }
    }, [signer, account, network, fetchBalances, setLoading, showSnackbar]);


    return { handleMintPosition, handleAddLiquidity, handleRemoveLiquidity };
};