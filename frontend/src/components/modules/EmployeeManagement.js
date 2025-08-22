import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Download, 
  Upload,
  UserCheck,
  UserX,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  UserPlus,
  Mail
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EmployeeManagement = ({ companyId, userRole, companyType = 'corporate' }) => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [applicationSearchTerm, setApplicationSearchTerm] = useState('');
  const [applicationFilterStatus, setApplicationFilterStatus] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('individual');
  
  // Dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [showApplicationDetailDialog, setShowApplicationDetailDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingApplication, setViewingApplication] = useState(null);
  
  // Form states
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    is_active: true
  });
  
  const [applicationDecision, setApplicationDecision] = useState({
    status: '',
    notes: ''
  });
  
  // Bulk upload states
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState(null);

  useEffect(() => {
    loadEmployees();
    loadApplications();
  }, [companyId]);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, filterType, filterStatus]);

  useEffect(() => {
    filterApplications();
  }, [applications, applicationSearchTerm, applicationFilterStatus]);

  const loadEmployees = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API}/${companyType}/${companyId}/employees`, {
        params: {
          limit: 100
        }
      });
      
      setEmployees(response.data.users || []);
    } catch (err) {
      console.error('Employee loading error:', err);
      setError('Çalışanlar yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const response = await axios.get(`${API}/${companyType}/${companyId}/applications`, {
        params: {
          limit: 100
        }
      });
      
      setApplications(response.data.applications || []);
    } catch (err) {
      console.error('Applications loading error:', err);
      // Don't set main error for applications as it's a secondary feature
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.phone.includes(searchTerm) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      if (filterType === 'corporate') {
        filtered = filtered.filter(emp => emp.role && emp.role.startsWith('corporate'));
      } else if (filterType === 'individual') {
        filtered = filtered.filter(emp => !emp.role || emp.role === 'individual');
      }
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(emp => 
        filterStatus === 'active' ? emp.is_active : !emp.is_active
      );
    }

    setFilteredEmployees(filtered);
  };

  const filterApplications = () => {
    let filtered = applications;

    // Filter by search term
    if (applicationSearchTerm) {
      filtered = filtered.filter(app => 
        app.applicant_full_name.toLowerCase().includes(applicationSearchTerm.toLowerCase()) ||
        app.applicant_phone.includes(applicationSearchTerm) ||
        (app.applicant_email && app.applicant_email.toLowerCase().includes(applicationSearchTerm.toLowerCase()))
      );
    }

    // Filter by status
    if (applicationFilterStatus !== 'all') {
      filtered = filtered.filter(app => app.status === applicationFilterStatus);
    }

    setFilteredApplications(filtered);
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEditForm({
      full_name: employee.full_name,
      email: employee.email || '',
      is_active: employee.is_active
    });
    setShowEditDialog(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.put(`${API}/${companyType}/${companyId}/employees/${editingEmployee.id}`, editForm);
      
      setSuccess('Çalışan bilgileri güncellendi');
      setShowEditDialog(false);
      loadEmployees();
    } catch (err) {
      console.error('Employee update error:', err);
      setError('Güncelleme sırasında hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (employeeId, newRole) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API}/${companyType}/${companyId}/employees/${employeeId}/role`, {
        role: newRole,
        is_active: true
      });
      
      setSuccess('Çalışan rolü güncellendi');
      loadEmployees();
    } catch (err) {
      console.error('Role update error:', err);
      setError('Rol güncellemesi sırasında hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkUploadFile) return;

    setBulkUploadLoading(true);
    setBulkUploadResult(null);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', bulkUploadFile);

      const response = await axios.post(`${API}/${companyType}/${companyId}/employees/bulk-import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setBulkUploadResult(response.data);
      if (response.data.success) {
        setSuccess(`${response.data.imported_count} çalışan başarıyla içe aktarıldı`);
        loadEmployees();
      }
    } catch (err) {
      console.error('Bulk upload error:', err);
      setError('Toplu yükleme sırasında hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setBulkUploadLoading(false);
    }
  };

  const handleViewApplication = (application) => {
    setViewingApplication(application);
    setApplicationDecision({
      status: '',
      notes: ''
    });
    setShowApplicationDetailDialog(true);
  };

  const handleApplicationDecision = async () => {
    if (!viewingApplication || !applicationDecision.status) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.put(`${API}/${companyType}/${companyId}/applications/${viewingApplication.id}`, applicationDecision);
      
      setSuccess(`Başvuru ${applicationDecision.status === 'approved' ? 'onaylandı' : 'reddedildi'}`);
      setShowApplicationDetailDialog(false);
      loadApplications();
      if (applicationDecision.status === 'approved') {
        loadEmployees(); // Reload employees if approved
      }
    } catch (err) {
      console.error('Application decision error:', err);
      setError('Başvuru işlemi sırasında hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const downloadExcelTemplate = async () => {
    try {
      const response = await axios.get(`${API}/${companyType}/${companyId}/employees/excel-template`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'calisan_sablonu.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Template download error:', err);
      setError('Şablon indirme sırasında hata oluştu');
    }
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'corporateOwner': 'Şirket Sahibi',
      'corporate4': 'Üst Düzey Yönetici',
      'corporate3': 'Orta Düzey Yönetici',
      'corporate2': 'Alt Düzey Yönetici',
      'corporate1': 'Çalışan',
      'cateringOwner': 'Catering Sahibi',
      'catering4': 'Üst Düzey Yönetici',
      'catering3': 'Orta Düzey Yönetici', 
      'catering2': 'Alt Düzey Yönetici',
      'catering1': 'Çalışan',
      'supplierOwner': 'Tedarikçi Sahibi',
      'supplier4': 'Üst Düzey Yönetici',
      'supplier3': 'Orta Düzey Yönetici',
      'supplier2': 'Alt Düzey Yönetici',
      'supplier1': 'Çalışan',
      'individual': 'Bireysel Kullanıcı'
    };
    return roleNames[role] || role;
  };

  const getStatusDisplayName = (status) => {
    const statusNames = {
      'pending': 'Bekleyen',
      'approved': 'Onaylandı',
      'rejected': 'Reddedildi'
    };
    return statusNames[status] || status;
  };

  const getStatusBadgeColor = (status) => {
    if (status === 'approved') return 'bg-green-100 text-green-800';
    if (status === 'rejected') return 'bg-red-100 text-red-800';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getRoleBadgeColor = (role) => {
    if (role?.includes('Owner')) return 'bg-purple-100 text-purple-800';
    if (role?.includes('4')) return 'bg-red-100 text-red-800';
    if (role?.includes('3')) return 'bg-orange-100 text-orange-800';
    if (role?.includes('2')) return 'bg-yellow-100 text-yellow-800';
    if (role?.includes('1')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const canManageEmployees = () => {
    return userRole && (userRole.includes('Owner') || userRole.includes('4') || userRole.includes('3'));
  };

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Çalışanlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Çalışan Yönetimi</h2>
          <p className="text-gray-600">Bireysel ve kurumsal hesapları yönetin</p>
        </div>
        {canManageEmployees() && (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={downloadExcelTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Excel Şablonu
            </Button>
            <Dialog open={showBulkUploadDialog} onOpenChange={setShowBulkUploadDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Toplu Yükle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Toplu Çalışan Yükleme</DialogTitle>
                  <DialogDescription>
                    Excel dosyasından çalışanları toplu olarak sisteme ekleyin
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setBulkUploadFile(e.target.files[0])}
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Yalnızca Excel dosyaları (.xlsx, .xls) kabul edilir
                    </p>
                  </div>
                  
                  {bulkUploadResult && (
                    <Alert className={bulkUploadResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                      <AlertDescription>
                        {bulkUploadResult.success ? (
                          <div>
                            <p className="text-green-800">
                              ✅ {bulkUploadResult.imported_count} çalışan başarıyla eklendi
                            </p>
                            {bulkUploadResult.failed_count > 0 && (
                              <p className="text-orange-800 mt-1">
                                ⚠️ {bulkUploadResult.failed_count} çalışan eklenemedi
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-red-800">❌ Yükleme başarısız oldu</p>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowBulkUploadDialog(false)}>
                      İptal
                    </Button>
                    <Button 
                      onClick={handleBulkUpload} 
                      disabled={!bulkUploadFile || bulkUploadLoading}
                    >
                      {bulkUploadLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Yükle
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Ad, telefon veya e-posta ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tür" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Çalışanlar</SelectItem>
                <SelectItem value="corporate">Kurumsal</SelectItem>
                <SelectItem value="individual">Bireysel</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Çalışanlar ({filteredEmployees.length})
          </CardTitle>
          <CardDescription>
            Şirketinizdeki tüm çalışanları görüntüleyin ve yönetin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Henüz çalışan bulunmamaktadır</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      employee.is_active ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {employee.is_active ? (
                        <UserCheck className="w-5 h-5 text-green-600" />
                      ) : (
                        <UserX className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">{employee.full_name}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{employee.phone}</span>
                        {employee.email && <span>• {employee.email}</span>}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getRoleBadgeColor(employee.role)}>
                          {getRoleDisplayName(employee.role)}
                        </Badge>
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {canManageEmployees() && (
                    <div className="flex items-center space-x-2">
                      <Select 
                        value={employee.role} 
                        onValueChange={(value) => handleRoleUpdate(employee.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Bireysel</SelectItem>
                          <SelectItem value="corporate1">Çalışan</SelectItem>
                          <SelectItem value="corporate2">Alt Düzey Yönetici</SelectItem>
                          <SelectItem value="corporate3">Orta Düzey Yönetici</SelectItem>
                          <SelectItem value="corporate4">Üst Düzey Yönetici</SelectItem>
                          {(userRole?.includes('Owner')) && (
                            <SelectItem value="corporateOwner">Şirket Sahibi</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditEmployee(employee)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Çalışan Düzenle</DialogTitle>
            <DialogDescription>
              Çalışan bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ad Soyad</label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Ad Soyad"
              />
            </div>
            <div>
              <label className="text-sm font-medium">E-posta</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="E-posta adresi"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={editForm.is_active}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              />
              <label htmlFor="is_active" className="text-sm font-medium">Aktif</label>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleUpdateEmployee} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Güncelle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeManagement;