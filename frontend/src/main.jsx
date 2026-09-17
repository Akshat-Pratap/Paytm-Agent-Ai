import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ThemeProvider } from './theme.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import '@fontsource/lato/400.css';
import '@fontsource/lato/700.css';
import '@fontsource/lato/900.css';
import './styles.css';
createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter><App /></BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  </ThemeProvider>
);
