import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
    useMemo,
  } from 'react';
  import { useAuthContext } from './AuthContext';
  import { MOCK_USER_BALANCES } from '../utils/mockData'; // Keep mock data for now
  
  interface BalancesContextType {
    userBalances: Record<string, number>;
    isLoadingBalances: boolean;
    errorBalances: string | null;
    fetchBalances: () => void; // Keep simple fetch trigger
    updateBalance: (tokenSymbol: string, delta: number) => void; // For actions
  }
  
  const BalancesContext = createContext<BalancesContextType | undefined>(undefined);
  
  export const useBalancesContext = () => {
    const context = useContext(BalancesContext);
    if (!context) {
      throw new Error('useBalancesContext must be used within a BalancesProvider');
    }
    return context;
  };
  
  interface BalancesProviderProps {
    children: ReactNode;
  }
  
  export const BalancesProvider: React.FC<BalancesProviderProps> = ({ children }) => {
    const { session } = useAuthContext(); // Get session from AuthContext
    const [userBalances, setUserBalances] = useState<Record<string, number>>({});
    const [isLoadingBalances, setIsLoadingBalances] = useState<boolean>(false);
    const [errorBalances, setErrorBalances] = useState<string | null>(null);
  
    const fetchBalances = useCallback(() => {
      if (!session?.user.address) {
        setUserBalances({}); // Clear balances if no user
        return;
      }
      // console.log(`Fetching balances for ${session.user.address}...`); // Debug log
      setIsLoadingBalances(true);
      setErrorBalances(null);
      // Simulate API call
      setTimeout(() => {
        try {
          // In real app, fetch based on session.user.address
          setUserBalances(MOCK_USER_BALANCES);
          setIsLoadingBalances(false);
        } catch (err: any) {
          console.error('Failed to fetch balances:', err);
          setErrorBalances('Failed to load balances.');
          setIsLoadingBalances(false);
        }
      }, 600); // Simulate delay
    }, [session]);
  
    // Fetch balances when session changes (login, logout, switch account)
    useEffect(() => {
      fetchBalances();
    }, [session, fetchBalances]); // Re-run when session or fetchBalances changes
  
    // Function for actions to update balance after simulated success
    const updateBalance = useCallback((tokenSymbol: string, delta: number) => {
      setUserBalances((prev) => ({
        ...prev,
        [tokenSymbol]: Math.max(0, (prev[tokenSymbol] ?? 0) + delta), // Ensure balance doesn't go below 0
      }));
    }, []);
  
    const contextValue = useMemo(
      () => ({
        userBalances,
        isLoadingBalances,
        errorBalances,
        fetchBalances,
        updateBalance,
      }),
      [userBalances, isLoadingBalances, errorBalances, fetchBalances, updateBalance]
    );
  
    return (
      <BalancesContext.Provider value={contextValue}>
        {children}
      </BalancesContext.Provider>
    );
  };