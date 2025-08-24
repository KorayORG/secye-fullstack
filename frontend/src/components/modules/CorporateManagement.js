import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Building2, 
  Users, 
  Calendar,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Heart,
  Clock,
  TrendingUp,
  Ban
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CorporateManagement = ({ companyId, userRole }) => {
  const [loading, setLoading] = useState(true);
  const [partnerships, setPartnerships] = useState([]);
  const [corporateCompanies, setCorporateCompanies] = useState([]);
  const [allCorporateCompanies, setAllCorporateCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'agreements'
  
  // Termination states
  const [showTerminationDialog, setShowTerminationDialog] = useState(false);
  const [selectedCorporate, setSelectedCorporate] = useState(null);
  const [terminationForm, setTerminationForm] = useState({
    reason: '',
    message: ''
  });
  const [terminationLoading, setTerminationLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Load all corporate companies
      const allCorporatesResponse = await axios.get(`${API}/companies`, {
        params: {
          type: 'corporate',
          limit: 100
        }
      });
      
      setAllCorporateCompanies(allCorporatesResponse.data.companies || []);
      
      // Get partnerships where this catering company is the partner
      const partnershipsResponse = await axios.get(`${API}/partnerships`, {
        params: {
          catering_id: companyId,
          partnership_type: 'catering'
        }
      });
      
      const partnershipData = partnershipsResponse.data.partnerships || [];
      setPartnerships(partnershipData);
      
      // Get details for each corporate company that we have partnerships with
      const corporateDetails = [];
      for (const partnership of partnershipData) {
        if (partnership.corporate_id && partnership.is_active) {
          try {
            const corporateResponse = await axios.get(`${API}/companies/${partnership.corporate_id}`);
            if (corporateResponse.data) {
              corporateDetails.push({
                ...corporateResponse.data,
                partnership_id: partnership.id,
                partnership_created_at: partnership.created_at
              });
            }
          } catch (err) {
            console.error(`Error loading corporate company ${partnership.corporate_id}:`, err);
          }
        }
      }
      
      setCorporateCompanies(corporateDetails);
      
    } catch (err) {
      console.error('Data loading error:', err);
      setError('Veriler yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeCount = (company) => {
    // This would normally come from the company data
    // For now, we'll use a placeholder or random number
    return company.employee_count || Math.floor(Math.random() * 200) + 50;
  };

  const handleOpenTerminationDialog = (company) => {
    setSelectedCorporate(company);
    setTerminationForm({ reason: '', message: '' });
    setShowTerminationDialog(true);
  };

  const handleSendTerminationRequest = async () => {
    if (!selectedCorporate || !selectedCorporate.partnership_id) return;

    if (!terminationForm.reason.trim()) {
      setError('Lütfen fesih nedenini belirtin');
      return;
    }

    if (!terminationForm.message.trim()) {
      setError('Lütfen fesih mesajını yazın');
      return;
    }

    setTerminationLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API}/catering/${companyId}/termination-requests`, {
        partnership_id: selectedCorporate.partnership_id,
        reason: terminationForm.reason,
        message: terminationForm.message
      });
      
      setSuccess(`${selectedCorporate.name} ile anlaşma fesih talebi gönderildi`);
      setShowTerminationDialog(false);
      setTerminationForm({ reason: '', message: '' });
      setSelectedCorporate(null);
      loadData(); // Reload to reflect changes
      
    } catch (err) {
      console.error('Termination request error:', err);
      setError('Fesih talebi gönderilirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTerminationLoading(false);
    }
  };

  const getDailyMealAverage = (company) => {
    // This would be calculated from actual meal orders
    // For now, we'll estimate based on employee count
    const employeeCount = getEmployeeCount(company);
    return Math.floor(employeeCount * 0.8); // Assume 80% participation rate
  };

  const filteredCorporates = corporateCompanies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManageCorporates = () => {
    return userRole && (userRole.includes('Owner') || userRole.includes('4') || userRole.includes('3'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Anlaşmalı firmalar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Anlaşmalı Firmalar</h2>
        <p className="text-gray-600">Catering hizmeti verdiğiniz firmaları görüntüleyin ve yönetin</p>
      </div>

      {/* Termination Dialog */}
      <Dialog open={showTerminationDialog} onOpenChange={setShowTerminationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <Ban className="w-5 h-5 mr-2" />
              Anlaşma Feshi
            </DialogTitle>
            <DialogDescription>
              {selectedCorporate?.name} ile anlaşmayı feshetmek istiyorsunuz
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Fesih Nedeni (Zorunlu)</Label>
              <Input
                id="reason"
                placeholder="Örn: Hizmet kalitesi, fiyat uyumsuzluğu..."
                value={terminationForm.reason}
                onChange={(e) => setTerminationForm({...terminationForm, reason: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Açıklama Mesajı (Zorunlu)</Label>
              <Textarea
                id="message"
                placeholder="Fesih kararınız hakkında detaylı açıklama..."
                value={terminationForm.message}
                onChange={(e) => setTerminationForm({...terminationForm, message: e.target.value})}
                rows={4}
              />
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                ⚠️ Bu fesih talebi karşı tarafa gönderilecektir. Onaylandıktan sonra anlaşma sona erecektir.
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowTerminationDialog(false)}
                disabled={terminationLoading}
              >
                İptal
              </Button>
              <Button 
                onClick={handleSendTerminationRequest}
                disabled={terminationLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {terminationLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4 mr-2" />
                    Fesih Talebi Gönder
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Search */}
      {corporateCompanies.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Firma ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Corporate Companies List */}
      <div>
        {filteredCorporates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              {corporateCompanies.length === 0 ? (
                <>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Henüz Anlaşmalı Firma Yok</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Firmalardan gelen teklifleri kabul ettiğinizde burada görünecekler
                  </p>
                  <div className="inline-flex items-center text-sm text-blue-600">
                    <Heart className="w-4 h-4 mr-1" />
                    <span>Teklifler sekmesinden gelen teklifleri kontrol edin</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-500">Arama kriterinize uygun firma bulunamadı</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCorporates.map((company) => (
              <Card key={company.id} className="hover:shadow-md transition-shadow border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center">
                        <Building2 className="w-5 h-5 mr-2 text-green-600" />
                        {company.name}
                      </CardTitle>
                      <CardDescription>@{company.slug}</CardDescription>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      <Heart className="w-3 h-3 mr-1" />
                      Anlaşmalı
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Çalışan Sayısı:</span>
                      <span className="font-medium flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {getEmployeeCount(company)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Günlük Ortalama:</span>
                      <span className="font-medium flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        {getDailyMealAverage(company)} öğün
                      </span>
                    </div>
                    
                    {company.partnership_created_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Anlaşma Tarihi:</span>
                        <span className="font-medium flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(company.partnership_created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Durum:</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Aktif
                      </Badge>
                    </div>
                    
                    {canManageCorporates() && (
                      <div className="flex space-x-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Detay
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenTerminationDialog(company)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          Fesih
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CorporateManagement;