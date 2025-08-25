import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
  Ban,
  FileText,
  XCircle,
  Timer,
  MessageSquare
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
  const [mainTab, setMainTab] = useState('companies'); // 'companies' or 'offers'
  
  // Offers states
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [terminationRequests, setTerminationRequests] = useState([]);
  
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
    if (mainTab === 'offers') {
      loadOffers();
      loadTerminationRequests();
    }
  }, [companyId, mainTab]);

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

  const loadOffers = async () => {
    setOffersLoading(true);
    
    try {
      const response = await axios.get(`${API}/catering/${companyId}/offers`, {
        params: {
          offer_type: 'received',
          limit: 50
        }
      });
      
      setOffers(response.data.offers || []);
    } catch (err) {
      console.error('Offers loading error:', err);
      setError('Teklifler yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setOffersLoading(false);
    }
  };

  const loadTerminationRequests = async () => {
    try {
      const response = await axios.get(`${API}/catering/${companyId}/termination-requests`, {
        params: {
          request_type: 'received',
          limit: 10
        }
      });
      
      setTerminationRequests(response.data.termination_requests || []);
    } catch (err) {
      console.error('Termination requests loading error:', err);
      // Don't show error for termination requests as it's secondary feature
    }
  };

  const handleOfferResponse = async (offerId, action) => {
    if (!window.confirm(`Bu teklifi ${action === 'accept' ? 'kabul' : 'red'} etmek istediğinizden emin misiniz?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await axios.put(`${API}/catering/${companyId}/offers/${offerId}`, {
        action
      });
      
      setSuccess(`Teklif ${action === 'accept' ? 'kabul edildi' : 'reddedildi'}`);
      loadOffers(); // Reload offers
      loadData(); // Reload partnerships if accepted
    } catch (err) {
      console.error('Offer response error:', err);
      setError('Teklif yanıtlanırken hata oluştu: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleTerminationResponse = async (requestId, action) => {
    if (!window.confirm(`Bu fesih talebini ${action === 'approve' ? 'onaylamak' : 'reddetmek'} istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      await axios.put(`${API}/catering/${companyId}/termination-requests/${requestId}`, {
        action
      });
      
      setSuccess(`Fesih talebi ${action === 'approve' ? 'onaylandı' : 'reddedildi'}`);
      loadTerminationRequests();
      if (action === 'approve') {
        loadData(); // Reload partnerships
      }
    } catch (err) {
      console.error('Termination response error:', err);
      setError('Fesih talebi yanıtlanırken hata oluştu: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Gerçek çalışan sayısı: bireysel kullanıcı sayısı
  const getEmployeeCount = (company) => {
    // Backend'den gelen individual_users alanını kullan
    return company.individual_users ?? company.employee_count ?? 0;
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

  // Günlük ortalama: aktif bireysel kullanıcı sayısı
  const getDailyMealAverage = (company) => {
    // Backend'den gelen aktif bireysel kullanıcı sayısı
    return company.active_individual_users ?? 0;
  };

  // Filtered data based on active tab and search
  const getFilteredCompanies = () => {
    const companies = activeTab === 'all' ? allCorporateCompanies : corporateCompanies;
    return companies.filter(company =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredCompanies = getFilteredCompanies();

  const canManageCorporates = () => {
    return userRole && (userRole.includes('Owner') || userRole.includes('4') || userRole.includes('3'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Firmalar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="companies">Firmalar</TabsTrigger>
          <TabsTrigger value="offers">Teklifler</TabsTrigger>
        </TabsList>

        {/* Companies Tab Content */}
        <TabsContent value="companies" className="space-y-6">
          {/* Header with Tabs */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Firmalar Yönetimi</h2>
            <p className="text-gray-600">Tüm corporate firmaları görüntüleyin ve anlaşmalı firmaları yönetin</p>
            
            {/* Tab Buttons */}
            <div className="mt-4 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'all'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Tüm Firmalar
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                    {allCorporateCompanies.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('agreements')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'agreements'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Anlaşmalı Firmalar
                  <span className="ml-2 bg-green-100 text-green-800 py-0.5 px-2.5 rounded-full text-xs font-medium">
                    {corporateCompanies.length}
                  </span>
                </button>
              </nav>
            </div>
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
          {(allCorporateCompanies.length > 0 || corporateCompanies.length > 0) && (
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder={`${activeTab === 'all' ? 'Tüm' : 'Anlaşmalı'} firmalar içinde ara...`}
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
            {filteredCompanies.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  {activeTab === 'all' ? (
                    allCorporateCompanies.length === 0 ? (
                      <>
                        <h3 className="text-lg font-medium text-gray-600 mb-2">Henüz Corporate Firma Yok</h3>
                        <p className="text-sm text-gray-500">
                          Sistemde kayıtlı corporate firma bulunmamaktadır
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-500">Arama kriterinize uygun firma bulunamadı</p>
                      </>
                    )
                  ) : (
                    corporateCompanies.length === 0 ? (
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
                        <p className="text-gray-500">Arama kriterinize uygun anlaşmalı firma bulunamadı</p>
                      </>
                    )
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompanies.map((company) => (
                  <Card key={company.id} className={`hover:shadow-md transition-shadow ${
                    activeTab === 'agreements' ? 'border-green-200 bg-green-50' : 'border-gray-200'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center">
                            <Building2 className={`w-5 h-5 mr-2 ${
                              activeTab === 'agreements' ? 'text-green-600' : 'text-orange-600'
                            }`} />
                            {company.name}
                          </CardTitle>
                          <CardDescription>@{company.slug}</CardDescription>
                        </div>
                        {activeTab === 'agreements' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Heart className="w-3 h-3 mr-1" />
                            Anlaşmalı
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Corporate
                          </Badge>
                        )}
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
                        
                        {activeTab === 'agreements' && (
                          <>
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
                          </>
                        )}
                        
                        {company.address && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Adres:</span>
                            <span className="font-medium text-right max-w-32 truncate">
                              {company.address.text || company.address}
                            </span>
                          </div>
                        )}
                        
                        {company.phone && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Telefon:</span>
                            <span className="font-medium">{company.phone}</span>
                          </div>
                        )}
                        
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
                            {activeTab === 'agreements' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenTerminationDialog(company)}
                                className="text-red-600 hover:text-red-700 hover:border-red-300"
                              >
                                <Ban className="w-4 h-4 mr-1" />
                                Fesih
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Offers Tab Content */}
        <TabsContent value="offers" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Teklifler</h2>
            <p className="text-gray-600">Gelen teklifleri görüntüleyin ve yanıtlayın</p>
          </div>

          {/* Alerts for offers tab */}
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

          {/* Termination Requests Section */}
          {terminationRequests.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Fesih Talepleri ({terminationRequests.length})
                </CardTitle>
                <CardDescription className="text-yellow-700">
                  Onayınızı bekleyen fesih talepleri
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {terminationRequests.map((request) => (
                    <div key={request.id} className="p-4 bg-white rounded-lg border border-yellow-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {request.requesting_company_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Neden: {request.reason}
                          </p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          Bekliyor
                        </Badge>
                      </div>
                      
                      {request.message && (
                        <div className="mb-3 p-3 bg-gray-50 rounded border">
                          <p className="text-sm text-gray-700">
                            <MessageSquare className="w-4 h-4 inline mr-1" />
                            {request.message}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleTerminationResponse(request.id, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Onayla
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTerminationResponse(request.id, 'reject')}
                          className="text-red-600 hover:text-red-700 border-red-300"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reddet
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Offers List */}
          {offersLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Teklifler yükleniyor...</p>
              </div>
            </div>
          ) : offers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">Henüz Teklif Yok</h3>
                <p className="text-sm text-gray-500">
                  Corporate firmalardan gelen teklifler burada görünecektir
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => (
                <Card key={offer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <Building2 className="w-5 h-5 text-orange-600 mr-2" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {offer.other_company?.name || 'Bilinmeyen Firma'}
                          </h3>
                          <Badge 
                            className={`ml-2 ${
                              offer.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                              offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}
                          >
                            {offer.status === 'sent' && (
                              <>
                                <Clock className="w-3 h-3 mr-1" />
                                Gönderildi
                              </>
                            )}
                            {offer.status === 'accepted' && (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Kabul Edildi
                              </>
                            )}
                            {offer.status === 'rejected' && (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Reddedildi
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Birim Fiyat</p>
                        <p className="font-semibold text-lg text-green-600">
                          ₺{offer.unit_price.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Süre</p>
                        <p className="font-medium flex items-center">
                          <Timer className="w-4 h-4 mr-1" />
                          {offer.duration_months} ay
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Başlangıç</p>
                        <p className="font-medium">
                          {offer.start_date ? new Date(offer.start_date).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Bitiş</p>
                        <p className="font-medium">
                          {offer.end_date ? new Date(offer.end_date).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                        </p>
                      </div>
                    </div>

                    {offer.message && (
                      <div className="mb-4 p-3 bg-gray-50 rounded border">
                        <p className="text-sm text-gray-700">
                          <MessageSquare className="w-4 h-4 inline mr-1" />
                          {offer.message}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <Calendar className="w-4 h-4 mr-1" />
                      Gönderilme: {new Date(offer.created_at).toLocaleString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>

                    {offer.status === 'sent' && (
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => handleOfferResponse(offer.id, 'accept')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Kabul Et
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleOfferResponse(offer.id, 'reject')}
                          className="text-red-600 hover:text-red-700 border-red-300"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reddet
                        </Button>
                      </div>
                    )}

                    {offer.status === 'accepted' && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-green-700 font-medium">
                            Teklif kabul edildi! Artık bu firmaya catering hizmeti verebilirsiniz.
                          </span>
                        </div>
                      </div>
                    )}

                    {offer.status === 'rejected' && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center">
                          <XCircle className="w-4 h-4 text-red-500 mr-2" />
                          <span className="text-sm text-red-700 font-medium">
                            Teklif reddedildi.
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CorporateManagement;