import React from 'react';
import Button from '@mui/material/Button';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAppContext } from '../../contexts/AppProvider';

export const SignOutButton: React.FC = () => {
  const { authentication } = useAppContext();

  return (
    <Button
      variant="outlined"
      color="error"
      fullWidth
      onClick={() => authentication.signOut()}
      startIcon={<LogoutIcon />}
    >
      Sign Out
    </Button>
  );
};