import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Settings, 
  Save, 
  History,
  Download,
  Filter,
  Calendar,
  Clock,
  User,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Building2,
  Shield
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SystemSettings = ({ companyId, userRole, companyType = 'corporate' }) => {
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    phone: '',
    address: {
      street: '',
      city: '',
      district: '',
      postal_code: ''
    }
  });
  
  // Audit log filters
  const [auditFilters, setAuditFilters] = useState({
    log_type: '',
    start_date: '',
    end_date: '',
    limit: 50
  });

  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    loadCompanySettings();
    loadAuditLogs();
  }, [companyId]);

  const loadCompanySettings = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API}/corporate/${companyId}/settings`);
      const company = response.data.company;
      
      setCompanySettings(company);
      setSettingsForm({
        name: company.name || '',
        phone: company.phone || '',
        address: {
          street: company.address?.street || '',
          city: company.address?.city || '',
          district: company.address?.district || '',
          postal_code: company.address?.postal_code || ''
        }
      });
    } catch (err) {
      console.error('Settings loading error:', err);
      setError('Ayarlar yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    
    try {
      const response = await axios.get(`${API}/corporate/${companyId}/audit-logs`, {
        params: auditFilters
      });
      
      setAuditLogs(response.data.logs || []);
    } catch (err) {
      console.error('Audit logs loading error:', err);
      // Don't show error for audit logs as user might not have permission
    } finally {
      setAuditLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.put(`${API}/corporate/${companyId}/settings`, {
        name: settingsForm.name,
        phone: settingsForm.phone,
        address: settingsForm.address
      });
      
      setSuccess('Şirket ayarları başarıyla güncellendi');
      loadCompanySettings();
    } catch (err) {
      console.error('Settings update error:', err);
      setError('Ayarları güncelleme sırasında hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleExportAuditLogs = async () => {
    try {
      const response = await axios.get(`${API}/corporate/${companyId}/audit-logs/export`, {
        params: auditFilters,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${companyId}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export error:', err);
      setError('Dışa aktarma sırasında hata oluştu');
    }
  };

  const getActivityIcon = (logType) => {
    const iconMap = {
      'USER_CREATED': User,
      'USER_UPDATED': User,
      'ROLE_ASSIGNED': Shield,
      'SHIFT_CREATED': Clock,
      'SHIFT_UPDATED': Clock,
      'COMPANY_UPDATED': Building2,
      'APPLICATION_APPROVED': CheckCircle,
      'APPLICATION_REJECTED': AlertTriangle,
      'MAIL_SENT': FileText
    };
    
    const IconComponent = iconMap[logType] || FileText;
    return <IconComponent className="w-4 h-4" />;
  };

  const getActivityColor = (logType) => {
    const colorMap = {
      'USER_CREATED': 'text-green-600',
      'USER_UPDATED': 'text-blue-600',
      'ROLE_ASSIGNED': 'text-purple-600',
      'SHIFT_CREATED': 'text-orange-600',
      'SHIFT_UPDATED': 'text-orange-600',
      'COMPANY_UPDATED': 'text-blue-600',
      'APPLICATION_APPROVED': 'text-green-600',
      'APPLICATION_REJECTED': 'text-red-600',
      'MAIL_SENT': 'text-gray-600'
    };
    
    return colorMap[logType] || 'text-gray-600';
  };

  const canManageSettings = () => {
    return userRole && (userRole.includes('Owner') || userRole.includes('4'));
  };

  const canViewAuditLogs = () => {
    return userRole && (userRole.includes('Owner') || userRole.includes('4') || userRole.includes('3'));
  };

  if (loading && !companySettings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Sistem ayarları yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Sistem Ayarları</h2>
        <p className="text-gray-600">Şirket bilgileri ve sistem konfigürasyonu</p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList>
          <TabsTrigger value="company" className="flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span>Şirket Bilgileri</span>
          </TabsTrigger>
          {canViewAuditLogs() && (
            <TabsTrigger value="audit" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>Sistem Logları</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Company Settings Tab */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Şirket Bilgileri
              </CardTitle>
              <CardDescription>
                Şirketinizin temel bilgilerini güncelleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {companySettings && (
                <>
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium">Şirket Adı</label>
                      <Input
                        value={settingsForm.name}
                        onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                        placeholder="Şirket adı"
                        disabled={!canManageSettings()}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Telefon</label>
                      <Input
                        value={settingsForm.phone}
                        onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                        placeholder="Telefon numarası"
                        disabled={!canManageSettings()}
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="text-sm font-medium mb-4 block">Adres Bilgileri</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Input
                          value={settingsForm.address.street}
                          onChange={(e) => setSettingsForm({ 
                            ...settingsForm, 
                            address: { ...settingsForm.address, street: e.target.value }
                          })}
                          placeholder="Sokak/Cadde"
                          disabled={!canManageSettings()}
                        />
                      </div>
                      <div>
                        <Input
                          value={settingsForm.address.district}
                          onChange={(e) => setSettingsForm({ 
                            ...settingsForm, 
                            address: { ...settingsForm.address, district: e.target.value }
                          })}
                          placeholder="İlçe"
                          disabled={!canManageSettings()}
                        />
                      </div>
                      <div>
                        <Input
                          value={settingsForm.address.city}
                          onChange={(e) => setSettingsForm({ 
                            ...settingsForm, 
                            address: { ...settingsForm.address, city: e.target.value }
                          })}
                          placeholder="İl"
                          disabled={!canManageSettings()}
                        />
                      </div>
                      <div>
                        <Input
                          value={settingsForm.address.postal_code}
                          onChange={(e) => setSettingsForm({ 
                            ...settingsForm, 
                            address: { ...settingsForm.address, postal_code: e.target.value }
                          })}
                          placeholder="Posta Kodu"
                          disabled={!canManageSettings()}
                        />
                      </div>
                    </div>
                  </div>

                  {/* System Information */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Sistem Bilgileri</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Şirket ID:</span>
                        <span className="text-sm font-mono">{companySettings.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Slug:</span>
                        <span className="text-sm font-mono">{companySettings.slug}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Durum:</span>
                        <Badge variant={companySettings.is_active ? "default" : "secondary"}>
                          {companySettings.is_active ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Oluşturma Tarihi:</span>
                        <span className="text-sm">
                          {new Date(companySettings.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  {canManageSettings() && (
                    <div className="flex justify-end pt-6 border-t">
                      <Button onClick={handleSaveSettings} disabled={loading}>
                        {loading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Kaydet
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        {canViewAuditLogs() && (
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      <History className="w-5 h-5 mr-2" />
                      Sistem Logları
                    </CardTitle>
                    <CardDescription>
                      Sistemde gerçekleşen tüm aktiviteleri görüntüleyin
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={handleExportAuditLogs}>
                    <Download className="w-4 h-4 mr-2" />
                    Dışa Aktar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <Select
                    value={auditFilters.log_type}
                    onValueChange={(value) => setAuditFilters({ ...auditFilters, log_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aktivite Türü" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tümü</SelectItem>
                      <SelectItem value="USER_CREATED">Kullanıcı Oluşturma</SelectItem>
                      <SelectItem value="USER_UPDATED">Kullanıcı Güncelleme</SelectItem>
                      <SelectItem value="ROLE_ASSIGNED">Rol Atama</SelectItem>
                      <SelectItem value="SHIFT_CREATED">Vardiya Oluşturma</SelectItem>
                      <SelectItem value="COMPANY_UPDATED">Şirket Güncelleme</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    type="date"
                    value={auditFilters.start_date}
                    onChange={(e) => setAuditFilters({ ...auditFilters, start_date: e.target.value })}
                    placeholder="Başlangıç Tarihi"
                  />
                  
                  <Input
                    type="date"
                    value={auditFilters.end_date}
                    onChange={(e) => setAuditFilters({ ...auditFilters, end_date: e.target.value })}
                    placeholder="Bitiş Tarihi"
                  />
                  
                  <Button onClick={loadAuditLogs} disabled={auditLoading}>
                    {auditLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Filter className="w-4 h-4 mr-2" />
                    )}
                    Filtrele
                  </Button>
                </div>

                {/* Logs List */}
                <div className="space-y-2">
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Sistem logu bulunmamaktadır</p>
                    </div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <div className={`mt-1 ${getActivityColor(log.type)}`}>
                          {getActivityIcon(log.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{log.description}</p>
                              {log.meta && Object.keys(log.meta).length > 0 && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {JSON.stringify(log.meta, null, 2)}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(log.created_at).toLocaleString('tr-TR')}
                            </div>
                          </div>
                          {log.actor_id && (
                            <div className="text-xs text-gray-500 mt-1">
                              Kullanıcı: {log.actor_id}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SystemSettings;