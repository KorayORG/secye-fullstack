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
  Clock, 
  Settings, 
  Mail, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';

// Import module components
import Dashboard from './modules/Dashboard';
import EmployeeManagement from './modules/EmployeeManagement';
import ShiftManagement from './modules/ShiftManagement';
import SystemSettings from './modules/SystemSettings';
import CateringManagement from './modules/CateringManagement';
import MailSystem from './modules/MailSystem';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CorporatePanel = () => {
  const { encUserId, encCompanyType, encCompanyId, page } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false); // Set to false for testing
  const [error, setError] = useState('');
  // Mock data for testing
  const [companyData, setCompanyData] = useState({
    id: 'test-company-id',
    name: 'Test Şirketi',
    type: 'corporate',
    address: 'Test Adresi',
    phone: '+90 555 123 4567'
  });
  const [dashboardStats, setDashboardStats] = useState({
    total_employees: 150,
    active_employees: 145,
    total_shifts: 5,
    partner_companies: 8
  });
  const [userProfile, setUserProfile] = useState({
    id: 'test-user-id',
    full_name: 'Test Kullanıcı',
    role: 'corporateOwner',
    email: 'test@test.com'
  });

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

      // Load dashboard stats based on company type
      let dashboardEndpoint;
      switch (companyType) {
        case 'corporate':
          dashboardEndpoint = `${API}/corporate/${companyId}/dashboard`;
          break;
        case 'catering':
          dashboardEndpoint = `${API}/catering/${companyId}/dashboard`;
          break;
        case 'supplier':
          dashboardEndpoint = `${API}/supplier/${companyId}/dashboard`;
          break;
        default:
          throw new Error('Geçersiz şirket tipi');
      }

      const dashboardResponse = await axios.get(dashboardEndpoint);
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
    if (!companyData) return [];
    
    const tabs = {
      corporate: [
        { id: 'general', label: 'Genel', icon: BarChart3 },
        { id: 'employees', label: 'Çalışanlar', icon: Users },
        { id: 'shifts', label: 'Vardiyalar', icon: Clock },
        { id: 'system', label: 'Sistem', icon: Settings },
        { id: 'caterings', label: 'Catering Firmaları', icon: Building2 },
        { id: 'mail', label: 'Mail', icon: Mail }
      ],
      catering: [
        { id: 'general', label: 'Genel', icon: BarChart3 },
        { id: 'employees', label: 'Çalışanlar', icon: Users },
        { id: 'system', label: 'Sistem', icon: Settings },
        { id: 'corporates', label: 'Firmalar', icon: Building2 },
        { id: 'suppliers', label: 'Tedarikçiler', icon: Building2 },
        { id: 'mail', label: 'Mail', icon: Mail }
      ],
      supplier: [
        { id: 'general', label: 'Genel', icon: BarChart3 },
        { id: 'employees', label: 'Çalışanlar', icon: Users },
        { id: 'system', label: 'Sistem', icon: Settings },
        { id: 'caterings', label: 'Catering Firmaları', icon: Building2 },
        { id: 'store', label: 'Mağazam', icon: Building2 },
        { id: 'mail', label: 'Mail', icon: Mail }
      ]
    };

    return tabs[companyData.type] || tabs.corporate;
  };

  const getCompanyTypeLabel = (type) => {
    const labels = {
      corporate: 'Firma',
      catering: 'Catering',
      supplier: 'Tedarikçi'
    };
    return labels[type] || type;
  };

  const logout = () => {
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Panel yükleniyor...</p>
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
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{companyData.name}</h1>
                <p className="text-sm text-gray-600">{getCompanyTypeLabel(companyData.type)} Paneli</p>
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

          {/* General Tab - Real Dashboard */}
          <TabsContent value="general" className="space-y-6">
            {dashboardStats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {companyData.type === 'corporate' && (
                    <>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Bireysel Hesaplar</CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{dashboardStats.individual_users}</div>
                          <p className="text-xs text-muted-foreground">Aktif kullanıcı</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Kurumsal Hesaplar</CardTitle>
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{dashboardStats.corporate_users}</div>
                          <p className="text-xs text-muted-foreground">Yönetici kullanıcı</p>
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
                          <CardTitle className="text-sm font-medium">Aktif Vardiyalar</CardTitle>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{dashboardStats.active_shifts}</div>
                          <p className="text-xs text-muted-foreground">Tanımlı vardiya</p>
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {companyData.type === 'catering' && (
                    <>
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
                    </>
                  )}

                  {companyData.type === 'supplier' && (
                    <>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Toplam Sipariş</CardTitle>
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{dashboardStats.total_orders}</div>
                          <p className="text-xs text-muted-foreground">Satır adedi</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Ürün Çeşidi</CardTitle>
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{dashboardStats.product_variety}</div>
                          <p className="text-xs text-muted-foreground">Stok çeşit sayısı</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Son 30 Gün</CardTitle>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{dashboardStats.recent_orders}</div>
                          <p className="text-xs text-muted-foreground">Yeni sipariş</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Partner Catering</CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{dashboardStats.partner_caterings}</div>
                          <p className="text-xs text-muted-foreground">Müşteri sayısı</p>
                        </CardContent>
                      </Card>
                    </>
                  )}
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
              companyType="corporate"
            />
          </TabsContent>

          {/* Shift Management Tab */}
          <TabsContent value="shifts">
            <ShiftManagement 
              companyId={getCompanyIdFromPath()} 
              userRole={userProfile?.role}
            />
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="system">
            <SystemSettings 
              companyId={getCompanyIdFromPath()} 
              userRole={userProfile?.role}
              companyType="corporate"
            />
          </TabsContent>

          {/* Catering Companies Tab */}
          <TabsContent value="caterings">
            <CateringManagement 
              companyId={getCompanyIdFromPath()} 
              userRole={userProfile?.role}
            />
          </TabsContent>

          {/* Mail System Tab */}
          <TabsContent value="mail">
            <MailSystem 
              companyId={getCompanyIdFromPath()} 
              userId={getUserIdFromPath()}
              userRole={userProfile?.role}
              companyType="corporate"
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CorporatePanel;