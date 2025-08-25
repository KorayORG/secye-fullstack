import React, { useState, useEffect } from 'react';
import { useAuth } from '../ProtectedRoute';
import { buildIndividualUrl } from '../../lib/crypto';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Home, 
  CheckSquare, 
  Star, 
  MessageSquare,
  Building2,
  Bell,
  Loader2,
  AlertTriangle,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const IndividualDashboard = () => {
  const navigate = useNavigate();
  const { companyId, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [companyId, userId]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API}/individual/${companyId}/${userId}/dashboard`);
      setDashboardData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Dashboard verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = async (path) => {
    try {
      const url = await buildIndividualUrl(companyId, userId, path);
      navigate(url);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
          <p className="text-gray-600">Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

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
          <Button 
            onClick={loadDashboardData}
            className="w-full mt-4"
            variant="outline"
          >
            Tekrar Dene
          </Button>
        </div>
      </div>
    );
  }

  const { user, company, stats, recent_activities } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Hoş Geldin, {user.full_name}
                </h1>
                <div className="mt-1 flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-500">{company.name}</span>
                </div>
              </div>
              {stats.new_notifications > 0 && (
                <Badge variant="destructive" className="flex items-center space-x-1">
                  <Bell className="h-3 w-3" />
                  <span>{stats.new_notifications} Bildirim</span>
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bekleyen Seçimler</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.pending_choices}
              </div>
              <p className="text-xs text-muted-foreground">
                Bu hafta için
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Puanlanmamış</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.unrated_meals}
              </div>
              <p className="text-xs text-muted-foreground">
                Yemek deneyimi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Öneriler</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.active_suggestions}
              </div>
              <p className="text-xs text-muted-foreground">
                İstek & öneri
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bu Ay</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                23
              </div>
              <p className="text-xs text-muted-foreground">
                Toplam seçim
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Navigation Cards */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Hızlı Erişim</CardTitle>
                <CardDescription>
                  Sık kullanılan özelliklere kolayca erişin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Button
                    onClick={() => handleNavigation('secim')}
                    className="h-16 flex flex-col items-center justify-center space-y-2"
                    variant="outline"
                  >
                    <CheckSquare className="h-6 w-6 text-orange-500" />
                    <span>Seçim Yap</span>
                  </Button>

                  <Button
                    onClick={() => handleNavigation('sectiklerim')}
                    className="h-16 flex flex-col items-center justify-center space-y-2"
                    variant="outline"
                  >
                    <Star className="h-6 w-6 text-yellow-500" />
                    <span>Seçtiklerim</span>
                  </Button>

                  <Button
                    onClick={() => handleNavigation('istek-oneri')}
                    className="h-16 flex flex-col items-center justify-center space-y-2"
                    variant="outline"
                  >
                    <MessageSquare className="h-6 w-6 text-blue-500" />
                    <span>İstek & Öneri</span>
                  </Button>

                  <Button
                    onClick={() => handleNavigation('hesabim')}
                    className="h-16 flex flex-col items-center justify-center space-y-2"
                    variant="outline"
                  >
                    <Home className="h-6 w-6 text-green-500" />
                    <span>Hesabım</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Son Aktiviteler</CardTitle>
                <CardDescription>
                  Güncel bildirimler ve etkinlikler
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recent_activities.length > 0 ? (
                  recent_activities.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Henüz aktivite yok
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Daily Reminders */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                <span>Bugünkü Hatırlatmalar</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-orange-900">
                      Öğlen Yemeği Seçimi
                    </p>
                    <p className="text-sm text-orange-600">
                      Yarının menüsünü seçmeyi unutmayın
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleNavigation('secim')}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    Seç
                  </Button>
                </div>
                
                {stats.unrated_meals > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <p className="font-medium text-yellow-900">
                        Yemek Değerlendirmesi
                      </p>
                      <p className="text-sm text-yellow-600">
                        {stats.unrated_meals} yemeğiniz puanlamayı bekliyor
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleNavigation('sectiklerim')}
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                    >
                      Puanla
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IndividualDashboard;