import React, { useState } from 'react';
import {
    Box,
    Button,
    Menu,
    MenuItem,
    Typography,
    ListItemIcon,
    Tooltip,
    Fade,
    Divider,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAppContext } from '../contexts/AppProvider';
import { shortenAddress } from '../utils/formatters';

const AppBarAccount: React.FC = () => {
    const { session, availableAccounts, authentication } = useAppContext();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const user = session?.user;

    // Render nothing if the user is not logged in
    if (!user) {
        return null;
    }

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSwitchAccount = (newAddress: string) => {
        if (newAddress !== user.address) {
            authentication.switchAccount(newAddress);
        }
        handleClose();
    };

    const handleSignOut = () => {
        authentication.signOut();
        handleClose(); // Close the menu after signing out
    };

    // Determine if account switching is possible
    const canSwitchAccounts = user.type === 'metamask' && availableAccounts && availableAccounts.length > 1;

    return (
        <>
            {/* Tooltip clarifies action: Connect info or Switch/Manage */}
            <Tooltip title={canSwitchAccounts ? "Switch Account / Disconnect" : `Connected: ${shortenAddress(user.address)}`}>
                <Button
                    id="account-button"
                    aria-controls={open ? 'account-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={handleClick}
                    color="inherit"
                    sx={{
                        textTransform: 'none',
                        ml: 1,
                        borderRadius: 1,
                        p: {xs: 0.5, sm: 1}, // Adjust padding slightly
                        minWidth: 'auto' // Allow button to shrink
                    }}
                    // Show dropdown icon only if menu has items (switch or disconnect)
                    endIcon={canSwitchAccounts ? <KeyboardArrowDownIcon /> : null}
                >
                    {/* Always show shortened address on larger screens */}
                    <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 500 }} noWrap>
                        {shortenAddress(user.address)}
                    </Typography>
                </Button>
            </Tooltip>
            <Menu
                id="account-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    'aria-labelledby': 'account-button',
                }}
                TransitionComponent={Fade}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                 slotProps={{ paper: { sx: { minWidth: 250, mt: 1, maxWidth: 350 }}}}
            >
                {/* Account Info Header */}
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body1" fontWeight="medium" noWrap>
                        {user.name || (user.type === 'metamask' ? 'MetaMask User' : 'Simulated User')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ wordBreak: 'break-all'}}>
                        {user.address}
                    </Typography>
                </Box>
                <Divider />

                {/* Account Switching Section (only if applicable) */}
                {canSwitchAccounts && (
                    <>
                        <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                            Available Accounts
                        </Typography>
                        {availableAccounts.map((account) => (
                            <MenuItem
                                key={account}
                                selected={account === user.address}
                                onClick={() => handleSwitchAccount(account)}
                                sx={{ justifyContent: 'space-between' }}
                            >
                                <Typography variant="body2" noWrap sx={{ mr: 2 }}>{account}</Typography>
                                {account === user.address && (
                                    <ListItemIcon sx={{ minWidth: 'auto' }}>
                                        <CheckIcon fontSize="small" color="primary" />
                                    </ListItemIcon>
                                )}
                            </MenuItem>
                        ))}
                        <Divider />
                    </>
                )}

                {/* Disconnect Button */}
                <MenuItem onClick={handleSignOut} sx={{ color: 'error.main' }}>
                    <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: 'error.main' }}>
                        <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    Disconnect
                </MenuItem>
            </Menu>
        </>
    );
};

export default AppBarAccount;