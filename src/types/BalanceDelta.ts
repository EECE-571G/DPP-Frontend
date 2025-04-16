// src/types/BalanceDelta.ts
import { ethers } from 'ethers';

// BalanceDelta is represented as an int256 in Solidity,
// packing two int128 values.
// type BalanceDelta = ethers.BigNumberish; // Using BigNumberish for flexibility

// Helper functions (can be adapted from Solidity if needed,
// but often the contract returns the packed int256 directly)

const MASK_128 = (1n << 128n) - 1n;

export function getAmount0Delta(delta: ethers.BigNumberish): bigint {
    const deltaBn = BigInt(delta.toString());
    // Extract lower 128 bits and sign extend
    return BigInt.asIntN(128, deltaBn & MASK_128);
}

export function getAmount1Delta(delta: ethers.BigNumberish): bigint {
    const deltaBn = BigInt(delta.toString());
    // Extract upper 128 bits and sign extend
    return BigInt.asIntN(128, deltaBn >> 128n);
}

// You might not need `toBalanceDelta` on the frontend
// export function toBalanceDelta(amount0: bigint, amount1: bigint): bigint {
//     const amount0Bits = BigInt.asUintN(128, amount0);
//     const amount1Bits = BigInt.asUintN(128, amount1);
//     return (amount1Bits << 128n) | amount0Bits;
// }

// Re-export the type if needed elsewhere, though using BigNumberish is often simpler
export type BalanceDelta = ethers.BigNumberish;