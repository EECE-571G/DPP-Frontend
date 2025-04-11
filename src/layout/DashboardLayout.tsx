import React, { ReactNode, useState } from 'react';
import { styled, useTheme, Theme, CSSObject, alpha } from '@mui/material/styles';
import {
  Box,
  Drawer as MuiDrawer,
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
  Tooltip,
  useMediaQuery
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

// Import context and components
import { useAppContext } from '../contexts/AppProvider';
import ThemeToggleButton from '../components/ThemeToggle';
import { SidebarFooterProps, NavigationItem } from '../types';

// --- Constants ---
const drawerWidth = 210;
const closedDrawerWidthSm = (theme: Theme) => `calc(${theme.spacing(7)} + 1px)`;
const closedDrawerWidthMd = (theme: Theme) => `calc(${theme.spacing(8)} + 1px)`;

// --- Styled Components ---

// Mixin for opened drawer style
const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  borderRight: `1px solid ${theme.palette.divider}`,
});

// Mixin for closed drawer style
const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: closedDrawerWidthSm(theme),
  [theme.breakpoints.up('sm')]: {
    width: closedDrawerWidthMd(theme),
  },
  borderRight: `1px solid ${theme.palette.divider}`,
});

// Header inside the Drawer
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar, // Keep height for alignment
}));

// Custom AppBar - Fixed width, contrast color
const AppBar = styled(MuiAppBar)(({ theme }) => {
  const appBarBackgroundColor = theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.85)
    : alpha(theme.palette.primary.main, 0.95);

  return {
    zIndex: theme.zIndex.drawer + 1,
    position: 'fixed',
    width: '100%',
    marginLeft: 0,
    backgroundColor: appBarBackgroundColor,
    backdropFilter: 'blur(8px)',
    boxShadow: 'none',
    borderBottom: `1px solid ${theme.palette.divider}`,
    color: theme.palette.getContrastText(appBarBackgroundColor),
    transition: theme.transitions.create(['background-color', 'color'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  };
});


// Custom Drawer component applying the mixins
const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
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
  }),
);
// --- End Styled Components ---


// --- DashboardLayout Props ---
interface DashboardLayoutProps {
  children: ReactNode;
  slots?: {
    toolbarContent?: React.ComponentType;
    sidebarFooter?: React.ComponentType<SidebarFooterProps>;
  };
}

// --- DashboardLayout Component ---
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  slots = {},
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(!isMobile);
  const { navigation, router } = useAppContext();

  // Single handler to toggle the drawer state
  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  // Get slot components
  const ToolbarContent = slots.toolbarContent;
  const SidebarFooter = slots.sidebarFooter;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Top Application Bar */}
      <AppBar elevation={0}>
        <Toolbar>
          {/* Single Toggle Button */}
          <IconButton
            color="inherit"
            aria-label={open ? 'close drawer' : 'open drawer'} // Dynamic aria-label
            onClick={handleDrawerToggle} // Use the single toggle handler
            edge="start"
            sx={{
              marginRight: 2,
            }}
          >
            {/* Show different icon based on state */}
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>

          {/* App Title */}
          <Typography variant="h6" noWrap component="div" sx={{fontWeight: 'bold', flexGrow: { xs: 1, sm: 0 }}}>
            DPP Frontend
          </Typography>
          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />
          {/* Theme Toggle Button */}
          <ThemeToggleButton />
          {/* Custom Toolbar Content */}
          {ToolbarContent && <ToolbarContent />}
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer variant="permanent" open={open}>
        {/* DrawerHeader provides top spacing matching Toolbar height */}
        <DrawerHeader>
          {/* Close button is removed from here */}
        </DrawerHeader>
        <Divider />
        {/* Navigation List */}
        <List sx={{ p: 0 }}>
          {navigation.map((item: NavigationItem, index: number) => {
            // Render Header sections differently
            if (item.kind === 'header') {
              return (
                <ListItem key={index} sx={{ pt: 2, pb: 1, pl: open ? 2.5 : 0, justifyContent: open ? 'flex-start': 'center' }} dense>
                  {open ? (
                     <Typography variant="overline" color="text.secondary" sx={{ pl: 0.5 }}>
                        {item.title}
                     </Typography>
                  ) : (
                    <Divider sx={{ width: '80%', margin: 'auto'}}/>
                  )}
                </ListItem>
              );
            }

            // Render standard navigation items
            const isSelected = router.pathname.substring(1) === item.segment;
            return (
              <ListItem
                key={item.segment || item.title}
                disablePadding
                sx={{ display: 'block' }}
              >
                <Tooltip title={!open ? item.title : ""} placement="right">
                    <ListItemButton
                        sx={{
                            minHeight: 48,
                            justifyContent: open ? 'initial' : 'center',
                            px: 2.5,
                            borderRadius: 1,
                            mx: open ? 1 : 0.5,
                            my: 0.5,
                            '&.Mui-selected': {
                                bgcolor: 'action.selected',
                                fontWeight: 'fontWeightBold',
                                '&:hover': { bgcolor: 'action.selected' }
                            },
                        }}
                        selected={isSelected}
                        onClick={() => item.segment && router.navigate(`/${item.segment}`)}
                        aria-current={isSelected ? 'page' : undefined}
                    >
                    {item.icon && (
                        <ListItemIcon
                        sx={{
                            minWidth: 0,
                            mr: open ? 3 : 'auto',
                            justifyContent: 'center',
                            color: isSelected ? 'primary.main' : 'inherit',
                        }}
                        >
                        {item.icon}
                        </ListItemIcon>
                    )}
                    <ListItemText
                        primary={item.title}
                        sx={{ opacity: open ? 1 : 0, transition: theme.transitions.create('opacity') }}
                    />
                    {open && item.action && ( <Box sx={{ ml: 'auto' }}> {item.action} </Box> )}
                    </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>

        {/* Sidebar Footer */}
        {SidebarFooter && (
          <Box sx={{ marginTop: 'auto', mb: 1 }}>
            <SidebarFooter mini={!open} />
          </Box>
        )}
      </Drawer>

      {/* Main Content Area - Dynamic margin ensures content flows correctly */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          bgcolor: 'background.default',
          color: 'text.primary',
          overflowY: 'auto',
          transition: theme.transitions.create('margin', {
             easing: theme.transitions.easing.sharp,
             duration: open ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* Use Toolbar for standard height padding below fixed AppBar */}
        <Toolbar />
        {/* Render the page content */}
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout;