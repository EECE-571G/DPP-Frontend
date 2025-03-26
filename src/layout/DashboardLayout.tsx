import React, { ReactNode, useState } from 'react';
import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles';
import {
  Box,
  Drawer,
  AppBar as MuiAppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useAppContext } from '../components/AppProvider';
import ThemeToggleButton from '../components/ThemeToggle';

const drawerWidth = 240;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

interface AppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

export interface SidebarFooterProps {
  mini: boolean;
}

interface DashboardLayoutProps {
  children: ReactNode;
  slots?: {
    toolbarAccount?: React.ComponentType;
    sidebarFooter?: React.ComponentType<SidebarFooterProps>;
  };
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  slots = {},
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const { navigation, router } = useAppContext();

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const ToolbarAccount = slots.toolbarAccount;
  const SidebarFooter = slots.sidebarFooter;

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            DPP Frontend Dashboard
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <ThemeToggleButton />
          {ToolbarAccount && <ToolbarAccount />}
        </Toolbar>
      </AppBar>
      <Drawer
    variant="permanent"
    open={open}
    sx={{
      width: drawerWidth,
      flexShrink: 0,
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
      ...(open && {
        ...openedMixin(theme),
        '& .MuiDrawer-paper': openedMixin(theme),
      }),
      ...(!open && {
        ...closedMixin(theme),
        '& .MuiDrawer-paper': closedMixin(theme),
      }),
    }}
  >
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {navigation.map((item, index) => {
            if (item.kind === 'header') {
              return (
                <ListItem key={index} sx={{ py: 1 }}>
                  <Typography variant="overline" color="text.secondary">
                    {item.title}
                  </Typography>
                </ListItem>
              );
            }
            
            return (
              <ListItem 
                key={index} 
                disablePadding 
                sx={{ display: 'block' }}
                onClick={() => item.segment && router.navigate(`/${item.segment}`)}
              >
                <ListItemButton
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                  }}
                  selected={router.pathname.substring(1) === item.segment}
                >
                  {item.icon && (
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 3 : 'auto',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                  )}
                  <ListItemText 
                    primary={item.title} 
                    sx={{ opacity: open ? 1 : 0 }} 
                  />
                  {open && item.action}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        
        {SidebarFooter && (
          <Box sx={{ marginTop: 'auto' }}>
            <SidebarFooter mini={!open} />
          </Box>
        )}
      </Drawer>
  <Box 
    component="main" 
    sx={{ 
      flexGrow: 1, 
      p: 3,
      bgcolor: 'background.default', 
      color: 'text.primary',
      minHeight: '100vh'
    }}
  >
    <DrawerHeader />
    {children}
  </Box>
</Box>
  );
};

export default DashboardLayout;