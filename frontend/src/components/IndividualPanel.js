import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Home, 
  CheckSquare, 
  Star, 
  MessageSquare,
  Building2,
  Bell,
  Loader2,
  AlertTriangle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const IndividualHome = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    pendingChoices: 0,
    unratedMeals: 0,
    activeSuggestions: 0,
    newNotifications: 0
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    setError('');

    try {
      // For now, we'll use a mock user ID and company ID
      // In a real implementation, these would come from authentication context
      const mockUserId = 'fe20bd75-bbe7-47f0-b4c1-80f073348e3d'; // From our seed data
      const mockCompanyId = 'b16cf400-a69c-4763-be02-2bdde874795b'; // A-Tech from seed

      // Load user profile
      const profileResponse = await axios.get(`${API}/user/profile`, {
        params: { user_id: mockUserId, company_id: mockCompanyId }
      });
      setUserProfile(profileResponse.data);

      // Load individual-specific dashboard data (we'll implement this API later)
      // For now, use placeholder stats
      setDashboardStats({
        pendingChoices: 1,
        unratedMeals: 3,
        activeSuggestions: 12,
        newNotifications: 2
      });

    } catch (err) {
      console.error('Individual data loading error:', err);
      setError('Veriler yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Panel yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Veri Yükleme Hatası
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600"
            >
              Giriş Sayfasına Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Kullanıcı profili yüklenemedi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Seç Ye</h1>
                <p className="text-sm text-gray-600">{userProfile.company.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">{userProfile.full_name}</p>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  Bireysel
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Hoş Geldiniz, {userProfile.full_name}!</h2>
          <p className="text-gray-600">Günlük menü seçimlerinizi yapın ve yemeklerinizi puanlayın.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Seçim Yap</CardTitle>
              <CheckSquare className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Bugün</div>
              <p className="text-xs text-muted-foreground">
                {dashboardStats.pendingChoices > 0 ? `${dashboardStats.pendingChoices} bekleyen seçim` : 'Seçim tamamlandı'}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Puanla</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.unratedMeals}</div>
              <p className="text-xs text-muted-foreground">Puanlanmamış yemek</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">İstek/Öneri</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.activeSuggestions}</div>
              <p className="text-xs text-muted-foreground">Aktif öneri</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bildirimler</CardTitle>
              <Bell className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.newNotifications}</div>
              <p className="text-xs text-muted-foreground">Yeni bildirim</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Feed */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Aktivite Akışı
            </CardTitle>
            <CardDescription>Kişisel aktivite ve sistem haberleri</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userProfile.company.name && (
                <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <Bell className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800">
                      {userProfile.company.name} şirketine hoş geldiniz!
                    </p>
                    <p className="text-xs text-orange-600">
                      Menü seçimlerinizi yapmaya başlayabilirsiniz.
                    </p>
                    <Button size="sm" className="mt-2 bg-orange-500 hover:bg-orange-600">
                      Menüleri Gör
                    </Button>
                  </div>
                  <div className="text-xs text-orange-500">Yeni</div>
                </div>
              )}

              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <CheckSquare className="w-5 h-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Hesabınız aktif edildi</p>
                  <p className="text-xs text-gray-600">
                    Tüm özellikleri kullanmaya başlayabilirsiniz.
                  </p>
                </div>
                <div className="text-xs text-gray-400">Yeni</div>
              </div>

              {dashboardStats.unratedMeals > 0 && (
                <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Star className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">Puanlama hatırlatması</p>
                    <p className="text-xs text-yellow-600">
                      {dashboardStats.unratedMeals} yemek puanınızı bekliyor.
                    </p>
                  </div>
                  <div className="text-xs text-yellow-500">Hatırlatma</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckSquare className="w-5 h-5 mr-2 text-orange-500" />
                Seçim Yap
              </CardTitle>
              <CardDescription>
                Günlük menü seçimlerinizi yapın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Bugün için mevcut menü seçeneklerini görüntüleyin ve tercih edin.
              </p>
              <Button className="w-full bg-orange-500 hover:bg-orange-600">
                Menüleri Gör
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                Puanla
              </CardTitle>
              <CardDescription>
                Yediğiniz yemekleri puanlayın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Son 7 günde yediğiniz yemeklere puan verin ve deneyiminizi paylaşın.
              </p>
              <Button variant="outline" className="w-full">
                Puanlamaya Git
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-500" />
                İstek/Öneri
              </CardTitle>
              <CardDescription>
                Görüş ve önerilerinizi paylaşın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Menü önerilerinizi paylaşın ve diğer çalışanların önerilerini görün.
              </p>
              <Button variant="outline" className="w-full">
                Önerileri Gör
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

const IndividualPanel = () => {
  return (
    <Routes>
      <Route path="/home" element={<IndividualHome />} />
      <Route path="/*" element={<IndividualHome />} />
    </Routes>
  );
};

export default IndividualPanel;