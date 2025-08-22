import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Users, 
  UserCheck, 
  Mail, 
  TrendingUp,
  Calendar,
  Building2,
  Star,
  ShoppingCart,
  Package,
  Clock,
  BarChart3,
  AlertTriangle
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || process.env.REACT_APP_BACKEND_URL;

const Dashboard = ({ companyId, userRole, companyType = 'corporate' }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    individual_users: 0,
    corporate_users: 0,
    daily_choices: 0,
    total_orders: 0,
    total_products: 0,
    company_rating: 0,
    partner_companies: 0
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardStats();
  }, [companyId]);

  const loadDashboardStats = async () => {
    setLoading(true);
    setError('');

    try {
      // Load different stats based on company type
      const endpoints = [];
      
      // Common endpoints
      endpoints.push(
        axios.get(`${API}/${companyType}/${companyId}/employees`, { params: { limit: 1000 } })
      );

      if (companyType === 'corporate') {
        endpoints.push(
          axios.get(`${API}/corporate/${companyId}/catering-companies`, { params: { limit: 100 } })
        );
      } else if (companyType === 'catering') {
        endpoints.push(
          axios.get(`${API}/catering/${companyId}/menus`, { params: { limit: 100 } })
        );
      } else if (companyType === 'supplier') {
        endpoints.push(
          axios.get(`${API}/supplier/${companyId}/products`, { params: { limit: 1000 } })
        );
      }

      const responses = await Promise.all(endpoints);
      
      // Calculate stats from responses
      const employees = responses[0].data.users || [];
      const individualUsers = employees.filter(emp => !emp.role || emp.role === 'individual').length;
      const corporateUsers = employees.filter(emp => emp.role && emp.role.includes(companyType) && emp.role !== 'individual').length;

      let additionalStats = {};
      
      if (companyType === 'corporate' && responses[1]) {
        additionalStats.partner_companies = responses[1].data.companies?.length || 0;
      } else if (companyType === 'catering' && responses[1]) {
        additionalStats.total_menus = responses[1].data.menus?.length || 0;
      } else if (companyType === 'supplier' && responses[1]) {
        additionalStats.total_products = responses[1].data.products?.length || 0;
      }

      setStats({
        individual_users: individualUsers,
        corporate_users: corporateUsers,
        daily_choices: Math.floor(Math.random() * 50) + 10, // Mock data for now
        company_rating: 4.2, // Mock data
        ...additionalStats
      });

    } catch (err) {
      console.error('Dashboard stats error:', err);
      setError('İstatistikler yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getCompanyTypeDisplayName = () => {
    const names = {
      'corporate': 'Firma',
      'catering': 'Catering',
      'supplier': 'Tedarikçi'
    };
    return names[companyType] || companyType;
  };

  const renderCorporateStats = () => (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Bireysel Kullanıcılar
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.individual_users}</div>
          <p className="text-xs text-muted-foreground">
            Şirketinizde kayıtlı bireysel hesaplar
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Kurumsal Kullanıcılar
          </CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.corporate_users}</div>
          <p className="text-xs text-muted-foreground">
            Yönetici ve kurumsal hesaplar
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Son 24 Saat Tercih
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.daily_choices}</div>
          <p className="text-xs text-muted-foreground">
            Bugün yapılan menü tercihleri
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Partner Catering
          </CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.partner_companies}</div>
          <p className="text-xs text-muted-foreground">
            Anlaşmalı catering firmaları
          </p>
        </CardContent>
      </Card>
    </>
  );

  const renderCateringStats = () => (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Şirket Puanı
          </CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center">
            {stats.company_rating}
            <Star className="h-5 w-5 text-yellow-500 ml-1" fill="currentColor" />
          </div>
          <p className="text-xs text-muted-foreground">
            5 üzerinden ortalama puan
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Hizmet Verilen Kullanıcı
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.individual_users}</div>
          <p className="text-xs text-muted-foreground">
            Bireysel kullanıcı sayısı
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Son 24 Saat Tercih
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.daily_choices}</div>
          <p className="text-xs text-muted-foreground">
            Bugün bildirilen tercih sayısı
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Aktif Menüler
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_menus || 0}</div>
          <p className="text-xs text-muted-foreground">
            Bu hafta için hazırlanan menüler
          </p>
        </CardContent>
      </Card>
    </>
  );

  const renderSupplierStats = () => (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Toplam Sipariş
          </CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_orders || 0}</div>
          <p className="text-xs text-muted-foreground">
            Tüm zamanlar toplam sipariş
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Mağaza Ürünleri
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_products}</div>
          <p className="text-xs text-muted-foreground">
            Mağazada bulunan ürün çeşidi
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Son 24 Saat Sipariş
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.floor(Math.random() * 15) + 5}</div>
          <p className="text-xs text-muted-foreground">
            Bugün alınan sipariş sayısı
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Çalışanlar
          </CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.corporate_users}</div>
          <p className="text-xs text-muted-foreground">
            Toplam kurumsal kullanıcı
          </p>
        </CardContent>
      </Card>
    </>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Genel Bakış</h2>
        <p className="text-gray-600">
          {getCompanyTypeDisplayName()} panelinizin özet istatistikleri
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {companyType === 'corporate' && renderCorporateStats()}
        {companyType === 'catering' && renderCateringStats()}
        {companyType === 'supplier' && renderSupplierStats()}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Son Aktiviteler
          </CardTitle>
          <CardDescription>
            Son zamanlarda gerçekleşen işlemler
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Yeni çalışan eklendi</p>
                  <p className="text-xs text-gray-500">2 saat önce</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Tamamlandı</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Yeni mesaj alındı</p>
                  <p className="text-xs text-gray-500">5 saat önce</p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800">Yeni</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Vardiya güncellendi</p>
                  <p className="text-xs text-gray-500">1 gün önce</p>
                </div>
              </div>
              <Badge className="bg-orange-100 text-orange-800">Güncellendi</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;