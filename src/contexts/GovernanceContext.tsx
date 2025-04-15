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
  import { Proposal, ProposalStatus } from '../types'; // Added ProposalStatus
  import { useAuthContext } from './AuthContext';
  import { usePoolsContext } from './PoolsContext';
  import { GOVERNANCE_CONTRACT_ADDRESS, TARGET_NETWORK_CHAIN_ID } from '../constants';
  // --- Import Governance ABI ---
  import DesiredPricePoolABI from '../abis/DesiredPricePool.json'; // <<< FIX: Import the correct ABI
  
  interface GovernanceMetaData {
    id: string;
    time: string;
    stage: string;
    // Add other relevant fields from your contract if needed
  }
  
  interface GovernanceContextType {
    proposals: Proposal[];
    governanceStatus: any; // Keeping this generic for now
    metaData: GovernanceMetaData | null;
    isLoadingProposals: boolean;
    isLoadingGovernanceData: boolean;
    errorProposals: string | null;
    errorGovernanceData: string | null;
    fetchGovernanceData: () => Promise<void>;
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
  
  // Use the imported ABI
  const GovernanceABI = DesiredPricePoolABI;
  
  export const GovernanceProvider: React.FC<GovernanceProviderProps> = ({ children }) => {
    const { provider, network } = useAuthContext(); // Use read-only provider
    const { selectedPool } = usePoolsContext();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [governanceStatus, setGovernanceStatus] = useState<any>([]); // Keeping this generic
    const [metaData, setMetaData] = useState<GovernanceMetaData | null>(null);
    const [isLoadingProposals, setIsLoadingProposals] = useState<boolean>(false); // Default false
    const [isLoadingGovernanceData, setIsLoadingGovernanceData] = useState<boolean>(false); // Default false
    const [errorProposals, setErrorProposals] = useState<string | null>(null);
    const [errorGovernanceData, setErrorGovernanceData] = useState<string | null>(null);
  
    // Helper to map contract status enum/number to frontend string status
    // NOTE: This mapping needs to match your DesiredPricePool/Poll.sol Stage enum EXACTLY
    const mapContractStatus = (contractStatus: number | bigint | undefined): ProposalStatus => {
        if (contractStatus === undefined) return 'pending'; // Handle undefined case
        const statusNum = Number(contractStatus);
        // *** Adjust mapping based on your Poll.Stage enum in Poll.sol ***
        switch (statusNum) {
            case 0: return 'pending';   // Example: Corresponds to Stage.PreVote
            case 1: return 'active';    // Example: Corresponds to Stage.Vote
            case 2: return 'succeeded'; // Example: Corresponds to Stage.FinalVote (or similar if your contract uses Succeeded state)
            case 3: return 'defeated';  // Example: Corresponds to Stage.PreExecution if result was NO/Hold, or needs custom logic
            case 4: return 'executed';  // Example: Corresponds to Stage.ExecutionReady (or after execution if tracked)
            // Add cases for other stages if applicable
            default: return 'pending';
        }
    };
  
    const fetchGovernanceData = useCallback(async () => {
        if (!provider || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            // console.log("Skipping governance fetch: Prerequisites not met.");
            setProposals([]); setGovernanceStatus([]); setMetaData(null);
            setErrorProposals(null); setErrorGovernanceData(null);
            setIsLoadingProposals(false); setIsLoadingGovernanceData(false);
            return;
        }
  
        // Use Ethers v6 ZeroAddress
        if (GOVERNANCE_CONTRACT_ADDRESS === ZeroAddress) {
             setErrorProposals("Governance contract address not configured.");
             setErrorGovernanceData("Governance contract address not configured.");
             setIsLoadingProposals(false); setIsLoadingGovernanceData(false);
             setProposals([]); setGovernanceStatus([]); setMetaData(null);
             return;
         }
  
        if (!GovernanceABI || GovernanceABI.length === 0) {
            setErrorProposals("Governance ABI is missing or empty.");
            setErrorGovernanceData("Governance ABI is missing or empty.");
            setIsLoadingProposals(false); setIsLoadingGovernanceData(false);
            setProposals([]); setGovernanceStatus([]); setMetaData(null);
            return;
        }

        if (!selectedPool || !selectedPool.poolId) {
            console.log("Skipping governance fetch: No pool selected or poolId missing.");
            setErrorGovernanceData("Please select a pool to view its governance details.");
            setProposals([]); setGovernanceStatus([]); setMetaData(null);
            setIsLoadingProposals(false); setIsLoadingGovernanceData(false);
            return;
        }
  
        setIsLoadingProposals(true); setIsLoadingGovernanceData(true);
        setErrorProposals(null); setErrorGovernanceData(null);

        try {
            const governanceContract = new Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernanceABI, provider);
            const currentPoolId = selectedPool.poolId;
            console.log(`[GovernanceContext] Fetching data for PoolId: ${currentPoolId}`);
  
            // --- Fetch Metadata & Status ---
            setIsLoadingGovernanceData(true);
            try {
                // --- Fetch Publicly Available Data ---
                let currentDesiredPrice = 'N/A';
                let govTokenAddr = 'N/A';

                try {
                    // Fetch desiredPrice for the specific pool
                    const dpResult = await governanceContract.desiredPrice(currentPoolId);
                    currentDesiredPrice = dpResult.toString(); // It's an int24
                    console.log(`[GovernanceContext] Fetched desiredPrice: ${currentDesiredPrice}`);
                } catch (dpErr) {
                    console.error(`[GovernanceContext] Failed to fetch desiredPrice for ${currentPoolId}:`, dpErr);
                     setErrorGovernanceData("Failed to fetch desired price.");
                }

                try {
                   govTokenAddr = await governanceContract.governanceToken();
                   console.log(`[GovernanceContext] Fetched governance token: ${govTokenAddr}`);
                } catch (gtErr) {
                   console.error(`[GovernanceContext] Failed to fetch governance token address:`, gtErr);
                }

                // We cannot reliably get the current poll ID, stage, or time left directly
                setMetaData({
                    id: 'N/A', // Poll ID not directly accessible
                    time: 'N/A', // Poll time/stage not directly accessible
                    stage: 'N/A', // Poll stage not directly accessible
                    // Add fetched public data if needed elsewhere
                    // desiredPrice: currentDesiredPrice,
                    // governanceToken: govTokenAddr,
                });
                 // Fetch governanceStatus if applicable from your contract (yours doesn't seem to have it)
                setGovernanceStatus([]);

            } catch (metaErr: any) {
                console.error("Failed to fetch governance metadata/status:", metaErr);
                setErrorGovernanceData(`Failed to load governance data: ${metaErr.message || String(metaErr)}`);
            } finally {
                setIsLoadingGovernanceData(false);
            }

            // --- Fetch Proposals (Not Applicable for this Contract) ---
            setIsLoadingProposals(true); // Keep for consistency
            try {
                setProposals([]); // No proposals to fetch
             } finally {
                setIsLoadingProposals(false);
             }

        } catch (err: any) {
            // ... error handling for contract initialization ...
             console.error('Failed to initialize governance contract:', err);
             const initErrorMsg = `Initialization error: ${err.message || String(err)}`;
             setErrorProposals(initErrorMsg);
             setErrorGovernanceData(initErrorMsg);
             setProposals([]); setGovernanceStatus([]); setMetaData(null);
        } finally {
             setIsLoadingProposals(false); // Ensure loading state reset
             setIsLoadingGovernanceData(false); // Ensure loading state reset
        }
    }, [provider, network, selectedPool]);
  
    // Make sure useEffect triggers when selectedPool changes
    useEffect(() => {
        if (provider && network?.chainId === TARGET_NETWORK_CHAIN_ID && selectedPool) { // Check selectedPool here
            fetchGovernanceData();
        } else {
             // Clear data if prerequisites are lost or no pool selected
            setProposals([]); setGovernanceStatus([]); setMetaData(null);
            setErrorProposals(null); setErrorGovernanceData(null);
            setIsLoadingProposals(false); setIsLoadingGovernanceData(false);
        }
    }, [provider, network, selectedPool, fetchGovernanceData]);
  
    const contextValue = useMemo(
        () => ({
            proposals,
            governanceStatus,
            metaData,
            isLoadingProposals,
            isLoadingGovernanceData,
            errorProposals,
            errorGovernanceData,
            fetchGovernanceData,
        }),
        [
            proposals,
            governanceStatus,
            metaData,
            isLoadingProposals,
            isLoadingGovernanceData,
            errorProposals,
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