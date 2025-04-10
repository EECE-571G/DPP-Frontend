import { useState, useCallback } from 'react';
import { AlertColor } from '@mui/material/Alert';

export interface SnackbarState {
    open: boolean;
    message: string;
    severity: AlertColor;
}

export const useSnackbar = () => {
    const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' });

    const showSnackbar = useCallback((message: string, severity: AlertColor = 'success') => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const handleCloseSnackbar = useCallback((event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    return { snackbar, showSnackbar, handleCloseSnackbar };
};