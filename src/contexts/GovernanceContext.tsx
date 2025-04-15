// src/contexts/GovernanceContext.tsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useMemo,
    useCallback,
} from 'react';
import { ethers, ZeroAddress, Contract } from 'ethers'; // Ethers v6 imports
import { Proposal, ProposalStatus } from '../types'; // Keep if needed elsewhere
import { useAuthContext } from './AuthContext';
import { usePoolsContext, V4Pool } from './PoolsContext';
import { GOVERNANCE_CONTRACT_ADDRESS, TARGET_NETWORK_CHAIN_ID } from '../constants';
import DesiredPricePoolABI from '../abis/DesiredPricePool.json';

// Updated Metadata Type - Poll specific data is now known to be unavailable directly
export interface GovernanceMetaData {
    poolId: string;
    desiredPriceTick: number | null;
    governanceToken: string | null;
    // Poll specific data - Defaults as we can't fetch internal state easily
    pollId: string;          // Will be 'N/A'
    pollStage: string;       // Will be 'N/A'
    pollTimeLeft: string;    // Will be 'N/A'
    pollIsPaused: boolean;   // Will be 'Unknown' effectively, default to true/false? Let's default false
    pollIsManualExecution: boolean; // Will be 'Unknown', default false
}

interface GovernanceContextType {
    proposals: Proposal[];
    governanceStatus: any; // Still generic
    metaData: GovernanceMetaData | null;
    isLoadingGovernanceData: boolean;
    errorGovernanceData: string | null;
    fetchGovernanceData: (pool?: V4Pool | null) => Promise<void>;
}

const GovernanceContext = createContext<GovernanceContextType | undefined>(undefined);

export const useGovernanceContext = () => {
    const context = useContext(GovernanceContext);
    if (!context) {
        throw new Error('useGovernanceContext must be used within a GovernanceProvider');
    }
    return context;
};

interface GovernanceProviderProps {
    children: ReactNode;
}

const GovernanceABI = DesiredPricePoolABI;

export const GovernanceProvider: React.FC<GovernanceProviderProps> = ({ children }) => {
    const { provider, network } = useAuthContext();
    const { selectedPool: contextSelectedPool } = usePoolsContext();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [governanceStatus, setGovernanceStatus] = useState<any>([]);
    const [metaData, setMetaData] = useState<GovernanceMetaData | null>(null);
    const [isLoadingGovernanceData, setIsLoadingGovernanceData] = useState<boolean>(false);
    const [errorGovernanceData, setErrorGovernanceData] = useState<string | null>(null);

    const fetchGovernanceData = useCallback(async (poolToFetch?: V4Pool | null) => {
        const currentPool = poolToFetch ?? contextSelectedPool;

        // --- Prerequisite Checks (keep these) ---
        if (!provider || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            setProposals([]); setGovernanceStatus([]); setMetaData(null); setErrorGovernanceData(null); setIsLoadingGovernanceData(false);
            return;
        }
        if (GOVERNANCE_CONTRACT_ADDRESS === ZeroAddress) {
            setErrorGovernanceData("Governance contract address not configured."); setIsLoadingGovernanceData(false); setProposals([]); setGovernanceStatus([]); setMetaData(null);
            return;
        }
        if (!GovernanceABI || GovernanceABI.length === 0) {
            setErrorGovernanceData("Governance ABI is missing or empty."); setIsLoadingGovernanceData(false); setProposals([]); setGovernanceStatus([]); setMetaData(null);
            return;
        }
        if (!currentPool || !currentPool.poolId) {
             setErrorGovernanceData(null);
            setProposals([]); setGovernanceStatus([]); setMetaData(null); setIsLoadingGovernanceData(false);
            return;
        }

        // --- Start Fetching ---
        setIsLoadingGovernanceData(true);
        setErrorGovernanceData(null);
        setMetaData(null);
        setProposals([]);
        setGovernanceStatus([]);

        const currentPoolId = currentPool.poolId;
        console.log(`[GovernanceContext] Fetching available governance data for PoolId: ${currentPoolId}`);

        try {
            const governanceContract = new Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernanceABI, provider);

            // --- Fetch Available Data Concurrently ---
            // REMOVED the governanceContract.polls call
            const results = await Promise.allSettled([
                governanceContract.desiredPrice(currentPoolId),
                governanceContract.governanceToken()
                // governanceContract.polls(currentPoolId) // <-- REMOVED THIS LINE
            ]);

            let fetchedDesiredPriceTick: number | null = null;
            let fetchedGovTokenAddr: string | null = null;

            // Process desiredPrice result
            if (results[0].status === 'fulfilled') {
                fetchedDesiredPriceTick = Number(results[0].value);
                console.log(`[GovernanceContext] Fetched desiredPriceTick: ${fetchedDesiredPriceTick}`);
            } else {
                console.error(`[GovernanceContext] Failed to fetch desiredPrice for ${currentPoolId}:`, results[0].reason);
                setErrorGovernanceData(prev => prev ? `${prev}; Failed desired price fetch` : "Failed desired price fetch");
            }

            // Process governanceToken result
            if (results[1].status === 'fulfilled') {
                fetchedGovTokenAddr = results[1].value;
                console.log(`[GovernanceContext] Fetched governance token: ${fetchedGovTokenAddr}`);
            } else {
                console.error(`[GovernanceContext] Failed to fetch governance token address:`, results[1].reason);
                 setErrorGovernanceData(prev => prev ? `${prev}; Failed gov token fetch` : "Failed gov token fetch");
            }

            // --- Set Poll Metadata to Defaults (as it's not fetchable) ---
            const pollMetaData = {
                pollId: 'N/A',
                pollStage: 'N/A',
                pollTimeLeft: 'N/A',
                pollIsPaused: false, // Default assumption or set based on events if implemented
                pollIsManualExecution: false, // Default assumption
            };
             console.log(`[GovernanceContext] Poll state cannot be fetched directly from internal mapping.`);


            // --- Set Final Metadata State ---
            setMetaData({
                poolId: currentPoolId,
                desiredPriceTick: fetchedDesiredPriceTick,
                governanceToken: fetchedGovTokenAddr,
                ...pollMetaData, // Use default poll data
            });

            // Governance Status and Proposals are still not directly fetched
            setGovernanceStatus([]);
            setProposals([]);

        } catch (err: any) {
            console.error(`[GovernanceContext] General error fetching data for ${currentPoolId}:`, err);
            const fetchErrorMsg = `Failed to load governance data: ${err.message || String(err)}`;
            setErrorGovernanceData(fetchErrorMsg);
            setProposals([]); setGovernanceStatus([]); setMetaData(null);
        } finally {
            setIsLoadingGovernanceData(false);
        }
    }, [provider, network, contextSelectedPool]);

    useEffect(() => {
        fetchGovernanceData(contextSelectedPool);
    }, [provider, network, contextSelectedPool, fetchGovernanceData]);

    const contextValue = useMemo(
        () => ({
            proposals,
            governanceStatus,
            metaData,
            isLoadingGovernanceData,
            errorGovernanceData,
            fetchGovernanceData,
        }),
        [
            proposals,
            governanceStatus,
            metaData,
            isLoadingGovernanceData,
            errorGovernanceData,
            fetchGovernanceData,
        ]
    );

    return (
        <GovernanceContext.Provider value={contextValue}>
            {children}
        </GovernanceContext.Provider>
    );
};