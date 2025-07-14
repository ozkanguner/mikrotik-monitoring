import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SnackbarProvider } from 'notistack';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import DeviceList from './components/DeviceList';
import DeviceDetail from './components/DeviceDetail';
import { Settings } from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={3}>
          <ErrorBoundary>
            <Router
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/devices" element={<DeviceList />} />
                    <Route path="/devices/:id" element={<DeviceDetail />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Box>
              </Box>
            </Router>
          </ErrorBoundary>
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App; 