import React, { createContext, ReactNode, useContext } from 'react'; // Added useContext
import { Snackbar, Alert } from '@mui/material';
import { useSnackbar as useSnackbarHook } from '../hooks/useSnackbar';
import { AlertColor } from '@mui/material/Alert';

// Define the type for the context value - only expose showSnackbar
interface SnackbarContextType {
    showSnackbar: (message: string, severity?: AlertColor) => void;
}

// Create the context
const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

// Export a hook to consume the context
export const useSnackbarContext = () => {
    const context = useContext(SnackbarContext);
    if (!context) {
        throw new Error('useSnackbarContext must be used within a SnackbarProvider');
    }
    return context;
};

interface SnackbarProviderProps {
    children: ReactNode;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
    // Use the original hook internally to manage state and render the component
    const { snackbar, showSnackbar, handleCloseSnackbar } = useSnackbarHook();

    // Provide only the 'showSnackbar' function through context
    // Ensure the context value is stable if showSnackbar is memoized (which it is in useSnackbarHook)
    const contextValue = React.useMemo(() => ({
        showSnackbar,
    }), [showSnackbar]);

    return (
        <SnackbarContext.Provider value={contextValue}>
            {children}
            {/* Render the Snackbar globally here, tied to the internal hook state */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </SnackbarContext.Provider>
    );
};