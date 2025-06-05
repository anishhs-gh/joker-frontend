import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  ThemeProvider,
  createTheme,
} from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#ffffff', // Using the primary color from your existing theme
    },
  },
});

const Navbar: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <img src="/assets/joker-api-logo.png" alt="Joker API Logo" style={{ height: '46px', marginRight: '10px' }} />
            <img src="/assets/anishhs_nobg_512px.png" alt="Anishh S" style={{ height: '32px', marginRight: '10px' }} />
          </Box>
        </Toolbar>
      </AppBar>
    </ThemeProvider>
  );
};

export default Navbar; 