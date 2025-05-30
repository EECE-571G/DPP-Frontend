// src/components/AppBarAccount.tsx
import React, { useState } from 'react';
import { Box, Button, Menu, MenuItem, Typography, ListItemIcon, Tooltip, Fade, Divider } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuthContext } from '../contexts/AuthContext';
import AnvilTimeControls from './AnvilTimeControls';

const AppBarAccount: React.FC = () => {
    // --- Get state/actions from Context ---
    const { session, availableAccounts, authentication } = useAuthContext();

    // --- Local State ---
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const user = session?.user;
    // --- Anvil Time Controls ---

    if (!user) return null; // Render nothing if not logged in

    const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const handleSwitchAccount = (newAddress: string) => {
        if (newAddress !== user.address) {
            authentication.switchAccount(newAddress); // Use context action
        }
        handleClose();
    };

    const handleSignOut = () => {
        window.location.reload();
        handleClose();
    };

    const canSwitchAccounts = availableAccounts && availableAccounts.length > 1;

    return (
        <>
            {/* Anvil Time Controls */}
            <AnvilTimeControls />
            <Tooltip title={canSwitchAccounts ? "Switch Account / Disconnect" : `Connected: ${user.address}`}>
                <Button id="account-button" aria-controls={open ? 'account-menu' : undefined} aria-haspopup="true" aria-expanded={open ? 'true' : undefined} onClick={handleClick} color="inherit" sx={{ textTransform: 'none', ml: 1, borderRadius: 1, p: {xs: 0.5, sm: 1}, minWidth: 'auto' }} endIcon={canSwitchAccounts ? <KeyboardArrowDownIcon /> : null}>
                    <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 500 }} noWrap>{user.address}</Typography>
                </Button>
            </Tooltip>
            <Menu id="account-menu" anchorEl={anchorEl} open={open} onClose={handleClose} MenuListProps={{ 'aria-labelledby': 'account-button' }} TransitionComponent={Fade} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { minWidth: 250, mt: 1, maxWidth: 350 }}}}>
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body1" fontWeight="medium" noWrap>{user.name || 'MetaMask User'}</Typography>
                </Box>
                <Divider />
                {canSwitchAccounts && (
                    <Box component="div">
                        <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>Available Accounts</Typography>
                        {availableAccounts.map((account) => (
                            <MenuItem key={account} selected={account === user.address} onClick={() => handleSwitchAccount(account)} sx={{ justifyContent: 'space-between' }}>
                                <Typography variant="body2" noWrap sx={{ mr: 2 }}>{account}</Typography>
                                {account === user.address && (<ListItemIcon sx={{ minWidth: 'auto' }}><CheckIcon fontSize="small" color="primary" /></ListItemIcon>)}
                            </MenuItem>
                        ))}
                        <Divider />
                    </Box>
                )}
                <MenuItem onClick={handleSignOut} sx={{ color: 'error.main' }}>
                    <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: 'error.main' }}><LogoutIcon fontSize="small" /></ListItemIcon>
                    Disconnect
                </MenuItem>
            </Menu>
        </>
    );
};

export default AppBarAccount;