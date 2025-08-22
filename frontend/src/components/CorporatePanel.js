import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  CheckCircle
} from 'lucide-react';

const CorporatePanel = () => {
  const { encUserId, encCompanyType, encCompanyId, page } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companyData, setCompanyData] = useState(null);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    // Simulate path verification and data loading
    setTimeout(() => {
      // Mock company data based on company type
      const mockCompanyData = {
        corporate: {
          name: 'A-Tech Yazılım',
          type: 'Firma',
          slug: 'a-tech',
          stats: {
            individualUsers: 45,
            corporateUsers: 8,
            totalPreferences: 234,
            activeShifts: 2
          }
        },
        catering: {
          name: 'LezzetSepeti',
          type: 'Catering',
          slug: 'lezzetsepeti',
          stats: {
            rating: 4.2,
            servedIndividuals: 156,
            totalPreferences: 892,
            partnerCorporates: 12
          }
        },
        supplier: {
          name: 'TazeMarket Gıda',
          type: 'Tedarikçi',
          slug: 'tazemarket',
          stats: {
            totalOrders: 67,
            productVariety: 145,
            recentOrders: 12,
            partnerCaterings: 8
          }
        }
      };

      // Mock role verification - in real app this would verify the signed segments
      const mockRole = 'corporateOwner'; // or catering3, supplier2, etc.
      
      setCompanyData(mockCompanyData.corporate); // Default to corporate for now
      setUserRole(mockRole);
      setLoading(false);
    }, 1000);
  }, [encUserId, encCompanyType, encCompanyId]);

  const getCompanyTypeFromEncoded = () => {
    // In real implementation, this would decode the signed segment
    return 'corporate';
  };

  const navigateToPage = (newPage) => {
    navigate(`/${encUserId}/${encCompanyType}/${encCompanyId}/${newPage}`);
  };

  const getAvailableTabs = () => {
    const companyType = getCompanyTypeFromEncoded();
    
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

    return tabs[companyType] || tabs.corporate;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
                <h1 className="text-xl font-semibold text-gray-900">{companyData?.name}</h1>
                <p className="text-sm text-gray-600">{companyData?.type} Paneli</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {userRole}
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/login')}
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

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bireysel Hesaplar</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{companyData?.stats?.individualUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">Aktif kullanıcı</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Kurumsal Hesaplar</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{companyData?.stats?.corporateUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">Yönetici kullanıcı</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Son 24h Tercih</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{companyData?.stats?.totalPreferences || 0}</div>
                  <p className="text-xs text-muted-foreground">Menü seçimi</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aktif Vardiyalar</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{companyData?.stats?.activeShifts || 0}</div>
                  <p className="text-xs text-muted-foreground">Tanımlı vardiya</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Son Aktiviteler</CardTitle>
                <CardDescription>Sistem genelindeki son hareketler</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Yeni menü yüklendi</p>
                      <p className="text-xs text-gray-500">LezzetSepeti tarafından - 2 saat önce</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">5 yeni çalışan eklendi</p>
                      <p className="text-xs text-gray-500">Toplu yükleme ile - 1 gün önce</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Vardiya güncellendi</p>
                      <p className="text-xs text-gray-500">Akşam vardiyası saatleri - 2 gün önce</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs - placeholder content */}
          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <CardTitle>Çalışan Yönetimi</CardTitle>
                <CardDescription>Bireysel ve kurumsal hesapları yönetin</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Çalışan yönetimi modülü yakında eklenecek...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shifts">
            <Card>
              <CardHeader>
                <CardTitle>Vardiya Yönetimi</CardTitle>
                <CardDescription>Vardiyaları oluşturun ve düzenleyin</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Vardiya yönetimi modülü yakında eklenecek...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Sistem Ayarları</CardTitle>
                <CardDescription>Şirket bilgileri ve sistem konfigürasyonu</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Sistem ayarları modülü yakında eklenecek...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="caterings">
            <Card>
              <CardHeader>
                <CardTitle>Catering Firmaları</CardTitle>
                <CardDescription>Anlaşmalı catering firmalarını yönetin</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Catering yönetimi modülü yakında eklenecek...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mail">
            <Card>
              <CardHeader>
                <CardTitle>Site İçi Mail</CardTitle>
                <CardDescription>Kurumsal e-posta sistemi</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Mail sistemi modülü yakında eklenecek...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CorporatePanel;