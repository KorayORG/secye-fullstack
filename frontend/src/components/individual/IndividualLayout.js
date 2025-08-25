import React, { useState } from 'react';
import { useAuth } from '../ProtectedRoute';
import { buildIndividualUrl } from '../../lib/crypto';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { 
  Home, 
  CheckSquare, 
  Star, 
  MessageSquare,
  User,
  Menu,
  X,
  LogOut
} from 'lucide-react';

const IndividualLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId, userId } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigation = async (path) => {
    try {
      const url = await buildIndividualUrl(companyId, userId, path);
      navigate(url);
      setMobileMenuOpen(false);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleLogout = () => {
    // Clear any stored tokens/session data
    localStorage.removeItem('authToken');
    sessionStorage.clear();
    
    // Redirect to login
    navigate('/login');
  };

  // Navigation items
  const navItems = [
    {
      name: 'Anasayfa',
      path: 'dashboard',
      icon: Home,
      current: location.pathname.includes('/dashboard')
    },
    {
      name: 'Seçim Yap',
      path: 'secim',
      icon: CheckSquare,
      current: location.pathname.includes('/secim')
    },
    {
      name: 'Seçtiklerim',
      path: 'sectiklerim',
      icon: Star,
      current: location.pathname.includes('/sectiklerim')
    },
    {
      name: 'İstek & Öneri',
      path: 'istek-oneri',
      icon: MessageSquare,
      current: location.pathname.includes('/istek-oneri')
    },
    {
      name: 'Hesabım',
      path: 'hesabim',
      icon: User,
      current: location.pathname.includes('/hesabim')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-orange-600">
                  Seç Ye
                </h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.path)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      item.current
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
              
              {/* Logout Button */}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Çıkış</span>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 bg-white">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.path)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium w-full text-left transition-colors ${
                      item.current
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
              
              {/* Mobile Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium w-full text-left text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Page Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default IndividualLayout;