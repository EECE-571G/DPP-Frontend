import React from 'react';
import IconButton from '@mui/material/IconButton';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Tooltip from '@mui/material/Tooltip';
import { useAppContext } from '../contexts/AppProvider';

const ThemeToggleButton: React.FC = () => {
  const { colorMode } = useAppContext();

  return (
    <Tooltip title={colorMode.mode === 'dark' ? "Switch to light mode" : "Switch to dark mode"}>
      <IconButton
         onClick={colorMode.toggleColorMode}
         color="inherit"
         aria-label={colorMode.mode === 'dark' ? "switch to light mode" : "switch to dark mode"}
         sx={{ ml: 1 }}
       >
        {colorMode.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggleButton;