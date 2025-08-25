import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { parseEncryptedParams, verifySession } from '../lib/crypto';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';

/**
 * ProtectedRoute component that handles encrypted URL parameters
 * and verifies tenant/user session security
 */
const ProtectedRoute = ({ children }) => {
  const params = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authData, setAuthData] = useState(null);

  useEffect(() => {
    verifyAccess();
  }, [params]);

  const verifyAccess = async () => {
    setLoading(true);
    setError('');

    try {
      // Parse encrypted URL parameters
      const { companyId, userId } = await parseEncryptedParams(params);

      // Verify session matches URL parameters (tenant security)
      const isValidSession = await verifySession(companyId, userId);
      
      if (!isValidSession) {
        setError('Oturum geçersiz veya yetkisiz erişim');
        // Redirect to login after delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        return;
      }

      // Set auth data for child components
      setAuthData({
        companyId,
        userId,
        encCompanyId: params.encCompanyId,
        encUserId: params.encUserId
      });

    } catch (error) {
      console.error('Protected route verification error:', error);
      setError('URL parametreleri geçersiz');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
          <p className="text-gray-600">Erişim kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <Alert className="border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
          <p className="text-sm text-gray-500 text-center mt-4">
            Giriş sayfasına yönlendiriliyorsunuz...
          </p>
        </div>
      </div>
    );
  }

  // Success - render children with auth context
  return (
    <AuthProvider authData={authData}>
      {children}
    </AuthProvider>
  );
};

/**
 * Auth context provider for passing decrypted auth data to child components
 */
const AuthContext = React.createContext();

const AuthProvider = ({ authData, children }) => {
  return (
    <AuthContext.Provider value={authData}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth data in child components
 */
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within a ProtectedRoute');
  }
  return context;
};

export default ProtectedRoute;