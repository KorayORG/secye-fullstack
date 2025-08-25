import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Shield, 
  Users, 
  Building2, 
  FileText, 
  Settings,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Edit,
  Eye,
  Activity,
  TrendingUp,
  UserCheck,
  AlertTriangle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dashboard state
  const [dashboardStats, setDashboardStats] = useState(null);

  // Applications state
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState('');
  const [applicationNotes, setApplicationNotes] = useState('');

  // Companies state
  const [companies, setCompanies] = useState([]);
  const [companyFilters, setCompanyFilters] = useState({
    type: '',
    active: null,
    search: ''
  });
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);

  // Auth token from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    
    // Load initial data
    loadDashboardStats();
  }, [navigate]);

  const loadDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/dashboard`, {
        headers: getAuthHeaders()
      });
      setDashboardStats(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      } else {
        setError('Dashboard verileri yüklenemedi');
      }
    }
  };

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/applications`, {
        headers: getAuthHeaders()
      });
      setApplications(response.data.applications);
    } catch (err) {
      setError('Başvurular yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (companyFilters.type) params.append('type', companyFilters.type);
      if (companyFilters.active !== null) params.append('active', companyFilters.active);
      if (companyFilters.search) params.append('search', companyFilters.search);
      
      const response = await axios.get(`${API}/admin/companies?${params}`, {
        headers: getAuthHeaders()
      });
      setCompanies(response.data.companies);
    } catch (err) {
      setError('Şirketler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (applicationId, status) => {
    setLoading(true);
    try {
      await axios.post(`${API}/admin/applications/${applicationId}/update`, {
        status: status,
        notes: applicationNotes
      }, {
        headers: getAuthHeaders()
      });
      
      setSuccess(`Başvuru ${status === 'approved' ? 'onaylandı' : 'reddedildi'}`);
      setSelectedApplication(null);
      setApplicationNotes('');
      loadApplications();
      loadDashboardStats(); // Refresh stats
    } catch (err) {
      setError('Başvuru işlenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyDetails = async (companyId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/companies/${companyId}/details`, {
        headers: getAuthHeaders()
      });
      setCompanyDetails(response.data);
    } catch (err) {
      setError('Şirket detayları yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const updateCompany = async (companyId, updateData) => {
    setLoading(true);
    try {
      await axios.put(`${API}/admin/companies/${companyId}`, updateData, {
        headers: getAuthHeaders()
      });
      
      setSuccess('Şirket bilgileri güncellendi');
      loadCompanies();
      if (selectedCompany?.id === companyId) {
        loadCompanyDetails(companyId);
      }
    } catch (err) {
      setError('Şirket güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  // Load data when tabs change
  useEffect(() => {
    if (activeTab === 'applications') {
      loadApplications();
    } else if (activeTab === 'companies') {
      loadCompanies();
    }
  }, [activeTab]);

  // Load companies when filters change
  useEffect(() => {
    if (activeTab === 'companies') {
      const timeoutId = setTimeout(() => {
        loadCompanies();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [companyFilters, activeTab]);

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      pending: 'Bekliyor',
      approved: 'Onaylandı',
      rejected: 'Reddedildi'
    };

    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getCompanyTypeBadge = (type) => {
    const variants = {
      corporate: 'bg-blue-100 text-blue-800',
      catering: 'bg-purple-100 text-purple-800',
      supplier: 'bg-green-100 text-green-800'
    };
    
    const labels = {
      corporate: 'Firma',
      catering: 'Catering',
      supplier: 'Tedarikçi'
    };

    return (
      <Badge className={variants[type] || 'bg-gray-100 text-gray-800'}>
        {labels[type] || type}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Master Admin Panel</h1>
                <p className="text-sm text-gray-600">Seç Ye Yönetim Sistemi</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                Master Admin
              </Badge>
              <Button variant="outline" size="sm" onClick={logout}>
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Başvurular</span>
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>Yönetim</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {dashboardStats && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Aktif Şirketler</CardTitle>
                      <Building2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {dashboardStats.active_companies}
                      </div>
                      <p className="text-xs text-muted-foreground">Aktif şirket sayısı</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pasif Şirketler</CardTitle>
                      <Building2 className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {dashboardStats.inactive_companies}
                      </div>
                      <p className="text-xs text-muted-foreground">Pasif şirket sayısı</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Toplam Şirket</CardTitle>
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {dashboardStats.total_companies}
                      </div>
                      <p className="text-xs text-muted-foreground">Tüm şirketler</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Yeni Başvurular</CardTitle>
                      <UserCheck className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {dashboardStats.pending_applications}
                      </div>
                      <p className="text-xs text-muted-foreground">Bekleyen başvuru</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Applications */}
                <Card>
                  <CardHeader>
                    <CardTitle>Son Başvurular</CardTitle>
                    <CardDescription>En son gelen kurumsal hesap başvuruları</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dashboardStats.recent_applications.map((app) => (
                        <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div>
                                <p className="font-medium">{app.applicant_name}</p>
                                <p className="text-sm text-gray-500">{app.company_name}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {app.mode === 'existing' ? 'Mevcut Şirket' : 'Yeni Şirket'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {getStatusBadge(app.status)}
                            <span className="text-xs text-gray-400">
                              {new Date(app.created_at).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Kurumsal Başvurular</h2>
              <Button onClick={loadApplications} variant="outline" size="sm">
                Yenile
              </Button>
            </div>

            <div className="space-y-4">
              {applications.map((app) => (
                <Card key={app.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold">{app.applicant.full_name}</h3>
                          <Badge variant="outline">
                            {app.mode === 'existing' ? 'Mevcut Şirket' : 'Yeni Şirket'}
                          </Badge>
                          {getStatusBadge(app.status)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Şirket:</strong> {app.company_info.name}</p>
                          <p><strong>Telefon:</strong> {app.applicant.phone}</p>
                          <p><strong>E-posta:</strong> {app.applicant.email}</p>
                          <p><strong>Başvuru Tarihi:</strong> {new Date(app.created_at).toLocaleDateString('tr-TR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {app.status === 'pending' && (
                          <>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedApplication(app)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Onayla
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Başvuru Onayı</DialogTitle>
                                  <DialogDescription>
                                    {app.applicant.full_name} adlı kişinin başvurusunu onaylamak istediğinizden emin misiniz?
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
                                    <Textarea
                                      id="notes"
                                      value={applicationNotes}
                                      onChange={(e) => setApplicationNotes(e.target.value)}
                                      placeholder="Onay ile ilgili notlarınız..."
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setSelectedApplication(null)}>
                                    İptal
                                  </Button>
                                  <Button 
                                    onClick={() => handleApplicationAction(app.id, 'approved')}
                                    disabled={loading}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Onayla
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedApplication(app)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reddet
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Başvuru Reddi</DialogTitle>
                                  <DialogDescription>
                                    {app.applicant.full_name} adlı kişinin başvurusunu reddetmek istediğinizden emin misiniz?
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="reject-notes">Red Nedeni</Label>
                                    <Textarea
                                      id="reject-notes"
                                      value={applicationNotes}
                                      onChange={(e) => setApplicationNotes(e.target.value)}
                                      placeholder="Red nedeni..."
                                      required
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setSelectedApplication(null)}>
                                    İptal
                                  </Button>
                                  <Button 
                                    onClick={() => handleApplicationAction(app.id, 'rejected')}
                                    disabled={loading || !applicationNotes.trim()}
                                    variant="destructive"
                                  >
                                    Reddet
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Companies Management Tab */}
          <TabsContent value="companies" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Şirket Yönetimi</h2>
              <Button onClick={loadCompanies} variant="outline" size="sm">
                Yenile
              </Button>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Filtreler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="search">Şirket Adı</Label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Şirket ara..."
                        value={companyFilters.search}
                        onChange={(e) => setCompanyFilters(prev => ({...prev, search: e.target.value}))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="type-filter">Şirket Tipi</Label>
                    <Select 
                      value={companyFilters.type} 
                      onValueChange={(value) => setCompanyFilters(prev => ({...prev, type: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tüm tipler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tüm tipler</SelectItem>
                        <SelectItem value="corporate">Firma</SelectItem>
                        <SelectItem value="catering">Catering</SelectItem>
                        <SelectItem value="supplier">Tedarikçi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="active-filter">Durum</Label>
                    <Select 
                      value={companyFilters.active === null ? '' : companyFilters.active.toString()} 
                      onValueChange={(value) => setCompanyFilters(prev => ({
                        ...prev, 
                        active: value === '' ? null : value === 'true'
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tüm durumlar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tüm durumlar</SelectItem>
                        <SelectItem value="true">Aktif</SelectItem>
                        <SelectItem value="false">Pasif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setCompanyFilters({ type: '', active: null, search: '' })}
                      className="w-full"
                    >
                      Temizle
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Companies List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {companies.map((company) => (
                <Card key={company.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-lg">{company.name}</h3>
                          {getCompanyTypeBadge(company.type)}
                          <Badge variant={company.is_active ? "default" : "secondary"}>
                            {company.is_active ? "Aktif" : "Pasif"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">@{company.slug}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kullanıcı Sayısı:</span>
                        <span className="font-medium">{company.user_count}</span>
                      </div>
                      {company.phone && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Telefon:</span>
                          <span className="font-medium">{company.phone}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kayıt Tarihi:</span>
                        <span className="font-medium">
                          {new Date(company.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mt-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedCompany(company);
                              loadCompanyDetails(company.id);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Detay
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{company.name} - Şirket Detayları</DialogTitle>
                          </DialogHeader>
                          
                          {companyDetails && (
                            <div className="space-y-6">
                              {/* Company Info */}
                              <div>
                                <h4 className="font-semibold mb-3">Şirket Bilgileri</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <Label>Şirket Adı</Label>
                                    <Input 
                                      defaultValue={companyDetails.company.name}
                                      onBlur={(e) => {
                                        if (e.target.value !== companyDetails.company.name) {
                                          updateCompany(company.id, { name: e.target.value });
                                        }
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Label>Telefon</Label>
                                    <Input 
                                      defaultValue={companyDetails.company.phone || ''}
                                      onBlur={(e) => {
                                        if (e.target.value !== companyDetails.company.phone) {
                                          updateCompany(company.id, { phone: e.target.value });
                                        }
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Label>Durum</Label>
                                    <Select
                                      value={companyDetails.company.is_active.toString()}
                                      onValueChange={(value) => {
                                        updateCompany(company.id, { is_active: value === 'true' });
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="true">Aktif</SelectItem>
                                        <SelectItem value="false">Pasif</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label>Tip</Label>
                                    <Input value={companyDetails.company.type} disabled />
                                  </div>
                                </div>
                              </div>

                              {/* Users */}
                              <div>
                                <h4 className="font-semibold mb-3">Kullanıcılar ({companyDetails.users.length})</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {companyDetails.users.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                                      <div>
                                        <p className="font-medium">{user.full_name}</p>
                                        <p className="text-xs text-gray-500">{user.phone}</p>
                                      </div>
                                      <div className="text-right">
                                        <Badge variant="outline">{user.role}</Badge>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {user.is_active ? 'Aktif' : 'Pasif'}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Recent Logs */}
                              <div>
                                <h4 className="font-semibold mb-3">Son İşlemler</h4>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                  {companyDetails.recent_logs.map((log, index) => (
                                    <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                                      <div className="flex justify-between">
                                        <span className="font-medium">{log.type}</span>
                                        <span className="text-gray-500">
                                          {new Date(log.created_at).toLocaleDateString('tr-TR')}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <Button 
                        size="sm" 
                        variant={company.is_active ? "destructive" : "default"}
                        onClick={() => updateCompany(company.id, { is_active: !company.is_active })}
                      >
                        {company.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Error/Success Messages */}
        {error && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mt-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;