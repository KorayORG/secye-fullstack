import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Download, 
  Upload,
  UserCheck,
  UserX,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const EmployeeManagement = ({ companyId, userRole, companyType = 'corporate' }) => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('individual');

  useEffect(() => {
    loadEmployees();
  }, [companyId]);

  const loadEmployees = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API}/${companyType}/${companyId}/employees`, {
        params: { limit: 100 }
      });
      
      setEmployees(response.data.users || []);
    } catch (err) {
      console.error('Employee loading error:', err);
      setError('Çalışanlar yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const canManageEmployees = () => {
    return userRole && (userRole.includes('Owner') || userRole.includes('4') || userRole.includes('3'));
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'corporateOwner': 'Şirket Sahibi',
      'corporate4': 'Üst Düzey Yönetici',
      'corporate3': 'Orta Düzey Yönetici',
      'corporate2': 'Alt Düzey Yönetici',
      'corporate1': 'Çalışan',
      'individual': 'Bireysel Kullanıcı'
    };
    return roleNames[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    if (role?.includes('Owner')) return 'bg-purple-100 text-purple-800';
    if (role?.includes('4')) return 'bg-blue-100 text-blue-800';
    if (role?.includes('3')) return 'bg-green-100 text-green-800';
    if (role?.includes('2')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
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
          <p className="text-gray-600">Çalışanları görüntüleyin ve yönetin</p>
        </div>
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

      {/* Employee Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="individual" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Bireysel Hesaplar</span>
          </TabsTrigger>
          <TabsTrigger value="corporate" className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4" />
            <span>Kurumsal Hesaplar</span>
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Başvurular</span>
          </TabsTrigger>
        </TabsList>

        {/* Individual Employees Tab */}
        <TabsContent value="individual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Bireysel Hesaplar ({employees.filter(emp => !emp.role || emp.role === 'individual').length})
              </CardTitle>
              <CardDescription>
                Şirketinizdeki bireysel kullanıcıları yönetin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.filter(emp => !emp.role || emp.role === 'individual').length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Henüz bireysel kullanıcı bulunmamaktadır</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {employees.filter(emp => !emp.role || emp.role === 'individual').map((employee) => (
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
                            <Badge className="bg-gray-100 text-gray-800">
                              Bireysel Kullanıcı
                            </Badge>
                            <Badge variant={employee.is_active ? "default" : "secondary"}>
                              {employee.is_active ? "Aktif" : "Pasif"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Corporate Employees Tab */}
        <TabsContent value="corporate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="w-5 h-5 mr-2" />
                Kurumsal Hesaplar ({employees.filter(emp => emp.role && emp.role.includes(companyType) && emp.role !== 'individual').length})
              </CardTitle>
              <CardDescription>
                Şirketinizdeki yönetici ve kurumsal kullanıcıları yönetin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.filter(emp => emp.role && emp.role.includes(companyType) && emp.role !== 'individual').length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Henüz kurumsal kullanıcı bulunmamaktadır</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {employees.filter(emp => emp.role && emp.role.includes(companyType) && emp.role !== 'individual').map((employee) => (
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Kurumsal Hesap Başvuruları
              </CardTitle>
              <CardDescription>
                Şirketinize kurumsal hesap açmak için yapılan başvuruları yönetin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Henüz başvuru bulunmamaktadır</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeManagement;