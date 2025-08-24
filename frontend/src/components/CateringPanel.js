import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Building2, 
  Users, 
  Settings, 
  Mail, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChefHat,
  Truck,
  Plus,
  FileText
} from 'lucide-react';

// Import module components (to be created)
import EmployeeManagement from './modules/EmployeeManagement';
import SystemSettings from './modules/SystemSettings';
import MailSystem from './modules/MailSystem';
// TODO: Create catering-specific modules
// import CorporateManagement from './modules/CorporateManagement';
// import SupplierManagement from './modules/SupplierManagement';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CateringPanel = () => {
  const { encUserId, encCompanyType, encCompanyId, page } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companyData, setCompanyData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Decode path segments (simplified - in real implementation would verify HMAC)
  const decodePathSegment = (encoded) => {
    try {
      const [payloadB64] = encoded.split('.');
      const padding = '='.repeat((4 - payloadB64.length % 4) % 4);
      const payload = JSON.parse(atob(payloadB64 + padding));
      return payload;
    } catch (e) {
      console.error('Path segment decode error:', e);
      return null;
    }
  };

  const getUserIdFromPath = () => {
    const decoded = decodePathSegment(encUserId);
    return decoded?.user_id;
  };

  const getCompanyIdFromPath = () => {
    const decoded = decodePathSegment(encCompanyId);
    return decoded?.company_id;
  };

  const getCompanyTypeFromPath = () => {
    const decoded = decodePathSegment(encCompanyType);
    return decoded?.company_type;
  };

  useEffect(() => {
    loadData();
  }, [encUserId, encCompanyType, encCompanyId]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const userId = getUserIdFromPath();
      const companyId = getCompanyIdFromPath();
      const companyType = getCompanyTypeFromPath();

      if (!userId || !companyId || !companyType) {
        setError('Geçersiz erişim parametreleri');
        setLoading(false);
        return;
      }

      // Load user profile
      const profileResponse = await axios.get(`${API}/user/profile`, {
        params: { user_id: userId, company_id: companyId }
      });
      setUserProfile(profileResponse.data);
      setCompanyData(profileResponse.data.company);

      // Load catering dashboard stats
      const dashboardResponse = await axios.get(`${API}/catering/${companyId}/dashboard`);
      setDashboardStats(dashboardResponse.data);

    } catch (err) {
      console.error('Data loading error:', err);
      if (err.response?.status === 401) {
        setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      } else if (err.response?.status === 403) {
        setError('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
      } else {
        setError('Veriler yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateToPage = (newPage) => {
    navigate(`/${encUserId}/${encCompanyType}/${encCompanyId}/${newPage}`);
  };

  const getAvailableTabs = () => {
    return [
      { id: 'general', label: 'Genel', icon: BarChart3 },
      { id: 'employees', label: 'Çalışanlar', icon: Users },
      { id: 'system', label: 'Sistem', icon: Settings },
      { id: 'corporates', label: 'Firmalar', icon: Building2 },
      { id: 'suppliers', label: 'Tedarikçiler', icon: Truck },
      { id: 'mail', label: 'Mail', icon: Mail }
    ];
  };

  const logout = () => {
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Catering paneli yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Erişim Hatası
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

  if (!companyData || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Veri yüklenemedi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{companyData.name}</h1>
                <p className="text-sm text-gray-600">Catering Paneli</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">{userProfile.full_name}</p>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {userProfile.role}
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={logout}
              >
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={page} onValueChange={navigateToPage} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
            {getAvailableTabs().map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center space-x-2">
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* General Tab - Dashboard */}
          <TabsContent value="general" className="space-y-6">
            {dashboardStats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Şirket Puanı</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats.rating.toFixed(1)}</div>
                      <p className="text-xs text-muted-foreground">5 üzerinden</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Hizmet Edilen</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats.served_individuals}</div>
                      <p className="text-xs text-muted-foreground">Bireysel kullanıcı</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Toplam Tercih</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats.total_preferences}</div>
                      <p className="text-xs text-muted-foreground">Menü seçimi</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Partner Firmalar</CardTitle>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats.partner_corporates}</div>
                      <p className="text-xs text-muted-foreground">Anlaşmalı şirket</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activities */}
                <Card>
                  <CardHeader>
                    <CardTitle>Son Aktiviteler</CardTitle>
                    <CardDescription>Son sistem hareketleri</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dashboardStats.recent_activities.length > 0 ? (
                        dashboardStats.recent_activities.map((activity, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{activity.description}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(activity.timestamp).toLocaleString('tr-TR')}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">Henüz aktivite bulunmamaktadır.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Employee Management Tab */}
          <TabsContent value="employees">
            <EmployeeManagement 
              companyId={getCompanyIdFromPath()} 
              userRole={userProfile?.role}
              companyType="catering"
            />
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="system">
            <SystemSettings 
              companyId={getCompanyIdFromPath()} 
              userRole={userProfile?.role}
              companyType="catering"
            />
          </TabsContent>

          {/* Corporate Management Tab */}
          <TabsContent value="corporates">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Anlaşmalı Firmalar</h2>
                <p className="text-gray-600">Catering hizmeti verdiğiniz firmaları yönetin</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-dashed border-2 border-gray-300 hover:border-orange-300 transition-colors cursor-pointer">
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <Plus className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Yeni Firma Ekle</h3>
                    <p className="text-sm text-gray-500">Catering hizmeti vermek istediğiniz firmayı ekleyin</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Örnek Firma A.Ş.</CardTitle>
                    <CardDescription>Teknoloji Şirketi</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Çalışan Sayısı:</span>
                        <span className="font-medium">150</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Günlük Ortalama:</span>
                        <span className="font-medium">120 öğün</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Durum:</span>
                        <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" className="flex-1">Detay</Button>
                      <Button size="sm" variant="outline">Düzenle</Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Demo İnşaat Ltd.</CardTitle>
                    <CardDescription>İnşaat Firması</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Çalışan Sayısı:</span>
                        <span className="font-medium">80</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Günlük Ortalama:</span>
                        <span className="font-medium">65 öğün</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Durum:</span>
                        <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" className="flex-1">Detay</Button>
                      <Button size="sm" variant="outline">Düzenle</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Supplier Management Tab */}
          <TabsContent value="suppliers">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Tedarikçi Yönetimi</h2>
                <p className="text-gray-600">Malzeme tedarikçilerinizi yönetin ve sipariş verin</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-dashed border-2 border-gray-300 hover:border-orange-300 transition-colors cursor-pointer">
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <Plus className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Yeni Tedarikçi Ekle</h3>
                    <p className="text-sm text-gray-500">Malzeme tedarikçinizi sisteme ekleyin</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Fresh Market Ltd.</CardTitle>
                    <CardDescription>Sebze & Meyve Tedarikçisi</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Kategori:</span>
                        <span className="font-medium">Taze Ürünler</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Son Sipariş:</span>
                        <span className="font-medium">2 gün önce</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Durum:</span>
                        <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" className="flex-1">Sipariş Ver</Button>
                      <Button size="sm" variant="outline">Detay</Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Et & Protein A.Ş.</CardTitle>
                    <CardDescription>Et & Protein Tedarikçisi</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Kategori:</span>
                        <span className="font-medium">Et Ürünleri</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Son Sipariş:</span>
                        <span className="font-medium">1 hafta önce</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Durum:</span>
                        <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" className="flex-1">Sipariş Ver</Button>
                      <Button size="sm" variant="outline">Detay</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Mail System Tab */}
          <TabsContent value="mail">
            <MailSystem 
              companyId={getCompanyIdFromPath()} 
              userId={getUserIdFromPath()}
              userRole={userProfile?.role}
              companyType="catering"
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CateringPanel;