import React from 'react';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, Box } from '@mui/material';
import { Dashboard, Add, SmartToy, Assessment, People, History, Settings } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { log, LOG_ACTIONS, LOG_RESOURCES } from '../services/auditLogger';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: Dashboard, path: '/' },
  { text: 'Start New Audit', icon: Add, path: '/start-audit' },
  { text: 'AI Assistant', icon: SmartToy, path: '/ai-assistant' },
  { text: 'Reports', icon: Assessment, path: '/reports' },
  { text: 'Users', icon: People, path: '/users' },
  { text: 'Audit Log', icon: History, path: '/audit-log' },
  { text: 'Settings', icon: Settings, path: '/settings' },
];

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            M-KOPA AI Audit Assistant
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => {
                    log({ action: LOG_ACTIONS.NAVIGATE, resource: LOG_RESOURCES.PAGE, details: `Navigated to ${item.text}`, resourceId: item.path });
                    navigate(item.path);
                  }}
                >
                  <ListItemIcon>
                    <item.icon />
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;