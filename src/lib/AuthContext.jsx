import React, { createContext, useState, useContext, useEffect } from 'react';
import { api, getAppPublicSettings, isApiConfigured } from '@/api/apiClient';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext();
const hasValidAppId = (value) => Boolean(value && value !== 'null' && value !== 'undefined');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      if (!hasValidAppId(appParams.appId)) {
        setAppPublicSettings({
          id: 'local',
          public_settings: { mode: 'local' }
        });
        await checkUserAuth();
        setIsLoadingPublicSettings(false);
        return;
      }
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      try {
        const publicSettings = await getAppPublicSettings(appParams.appId);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await api.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setIsLoadingAuth(false);
    } catch (error) {
      const isExpectedUnauthenticated = error?.status === 401;
      if (!isExpectedUnauthenticated) {
        console.error('User auth check failed:', error);
      }
      setIsLoadingAuth(false);
      setUser(null);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (isApiConfigured && (error.status === 401 || error.status === 403)) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const signInWithEmail = async ({ email, fullName, birthDate, password, mode }) => {
    setIsSigningIn(true);
    try {
      const currentUser = await api.auth.signInWithEmail({
        email,
        fullName,
        birthDate,
        password,
        mode,
      });
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      }
      setAuthError(null);
      return currentUser;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    try {
      const currentUser = await api.auth.signInWithGoogle();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      }
      setAuthError(null);
      return currentUser;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signInWithGoogleCredential = async (credentialToken) => {
    setIsSigningIn(true);
    try {
      const currentUser = await api.auth.signInWithGoogleCredential(credentialToken);
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      }
      setAuthError(null);
      return currentUser;
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Redirect to app home while respecting Vite base path (e.g. /midhd/ on Pages).
      api.auth.logout(import.meta.env.BASE_URL || '/');
    } else {
      // Just remove the token without redirect
      api.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    api.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      isSigningIn,
      signInWithEmail,
      signInWithGoogle,
      signInWithGoogleCredential,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
