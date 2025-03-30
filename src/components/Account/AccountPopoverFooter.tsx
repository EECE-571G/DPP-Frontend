import React from 'react';
import Box from '@mui/material/Box';

export const AccountPopoverFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
      {children}
    </Box>
  );
};