import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Building2, 
  Plus, 
  Search, 
  Star,
  Users,
  Phone,
  MapPin,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Heart,
  HeartOff,
  Send,
  TrendingUp,
  Clock,
  FileText,
  XCircle,
  Timer,
  MessageSquare,
  Calendar
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CateringManagement = ({ companyId, userRole }) => {
  const [loading, setLoading] = useState(true);
  const [caterings, setCaterings] = useState([]);
  const [partnerships, setPartnerships] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Offer dialog states
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [selectedCatering, setSelectedCatering] = useState(null);
  const [offerForm, setOfferForm] = useState({
    unit_price: '',
    message: '',
    duration_months: 12
  });
  const [offerLoading, setOfferLoading] = useState(false);

  useEffect(() => {
    loadCaterings();
    loadPartnerships();
  }, [companyId]);

  const loadCaterings = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API}/companies/search`, {
        params: {
          type: 'catering',
          limit: 50
        }
      });
      
      setCaterings(response.data.companies || []);
    } catch (err) {
      console.error('Catering loading error:', err);
      setError('Catering firmaları yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadPartnerships = async () => {
    try {
      const response = await axios.get(`${API}/corporate/${companyId}/partnerships`);
      setPartnerships(response.data.partnerships || []);
    } catch (err) {
      console.error('Partnership loading error:', err);
      // Don't show error for partnerships as this might be a new feature
    }
  };

  const searchCaterings = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await axios.get(`${API}/companies/search`, {
        params: {
          type: 'catering',
          query: query,
          limit: 20
        }
      });
      
      setSearchResults(response.data.companies || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Arama sırasında hata oluştu');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddPartnership = async (cateringId) => {
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API}/corporate/${companyId}/partnerships`, {
        catering_id: cateringId,
        partnership_type: 'catering'
      });
      
      setSuccess('Catering firması ile ortaklık kuruldu');
      loadPartnerships();
    } catch (err) {
      console.error('Partnership creation error:', err);
      setError('Ortaklık kurma sırasında hata oluştu: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSendOffer = async () => {
    if (!selectedCatering) return;

    if (!offerForm.unit_price || parseFloat(offerForm.unit_price) <= 0) {
      setError('Lütfen geçerli bir birim fiyat girin');
      return;
    }

    setOfferLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API}/corporate/${companyId}/offers`, {
        catering_id: selectedCatering.id,
        unit_price: parseFloat(offerForm.unit_price),
        message: offerForm.message,
        duration_months: parseInt(offerForm.duration_months)
      });
      
      setSuccess(`${selectedCatering.name} firmasına teklif gönderildi`);
      setShowOfferDialog(false);
      setOfferForm({ unit_price: '', message: '', duration_months: 12 });
      setSelectedCatering(null);
      
    } catch (err) {
      console.error('Send offer error:', err);
      setError('Teklif gönderilirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setOfferLoading(false);
    }
  };

  const handleOpenOfferDialog = (catering) => {
    setSelectedCatering(catering);
    setOfferForm({ unit_price: '', message: '', duration_months: 12 });
    setShowOfferDialog(true);
  };

  const handleRemovePartnership = async (partnershipId) => {
    if (!window.confirm('Bu ortaklığı sonlandırmak istediğinizden emin misiniz?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await axios.delete(`${API}/corporate/${companyId}/partnerships/${partnershipId}`);
      
      setSuccess('Ortaklık sonlandırıldı');
      loadPartnerships();
    } catch (err) {
      console.error('Partnership removal error:', err);
      setError('Ortaklık sonlandırma sırasında hata oluştu: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleViewCateringDetail = (catering) => {
    // TODO: Implement catering detail view functionality
    console.log('View catering detail:', catering);
  };

  const getPartnershipStatus = (cateringId) => {
    return partnerships.find(p => p.catering_id === cateringId);
  };

  const isPartner = (cateringId) => {
    return partnerships.some(p => p.catering_id === cateringId && p.is_active);
  };

  const renderRating = (rating) => {
    if (!rating) return <span className="text-gray-400">Değerlendirilmemiş</span>;
    
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-200 text-yellow-400" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }
    
    return (
      <div className="flex items-center space-x-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const filteredCaterings = caterings.filter(catering =>
    catering.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManageCaterings = () => {
    return userRole && (userRole.includes('Owner') || userRole.includes('4') || userRole.includes('3'));
  };

  if (loading && caterings.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Catering firmaları yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Catering Firmaları</h2>
          <p className="text-gray-600">Catering firmalarını keşfedin ve ortaklık kurun</p>
        </div>
        {canManageCaterings() && (
          <>
            {/* Offer Dialog */}
            <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Send className="w-5 h-5 mr-2" />
                    Teklif Gönder
                  </DialogTitle>
                  <DialogDescription>
                    {selectedCatering?.name} firmasına teklif gönder
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Birim Öğün Fiyatı (TL)</Label>
                    <div className="relative">
                      <TrendingUp className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <Input
                        id="unit_price"
                        type="number"
                        placeholder="Örn: 25.50"
                        value={offerForm.unit_price}
                        onChange={(e) => setOfferForm({...offerForm, unit_price: e.target.value})}
                        className="pl-9"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="duration_months">Anlaşma Süresi</Label>
                    <Select 
                      value={offerForm.duration_months.toString()} 
                      onValueChange={(value) => setOfferForm({...offerForm, duration_months: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Süre seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Ay</SelectItem>
                        <SelectItem value="6">6 Ay</SelectItem>
                        <SelectItem value="12">12 Ay (1 Yıl)</SelectItem>
                        <SelectItem value="24">24 Ay (2 Yıl)</SelectItem>
                        <SelectItem value="36">36 Ay (3 Yıl)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">Mesaj (Opsiyonel)</Label>
                    <Textarea
                      id="message"
                      placeholder="Teklifiniz hakkında ek bilgiler..."
                      value={offerForm.message}
                      onChange={(e) => setOfferForm({...offerForm, message: e.target.value})}
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowOfferDialog(false)}
                      disabled={offerLoading}
                    >
                      İptal
                    </Button>
                    <Button 
                      onClick={handleSendOffer}
                      disabled={offerLoading}
                    >
                      {offerLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Gönderiliyor...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Teklif Gönder
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Search Dialog */}
            <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Catering Ara
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Catering Firması Ara</DialogTitle>
                <DialogDescription>
                  Yeni catering firmaları bulun ve ortaklık kurun
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Firma adı ile ara..."
                    className="pl-9"
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchTerm(value);
                      searchCaterings(value);
                    }}
                  />
                </div>
                
                {searchLoading && (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 text-orange-500 animate-spin mx-auto" />
                  </div>
                )}
                
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {searchResults.map((catering) => (
                    <div key={catering.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <h4 className="font-medium">{catering.name}</h4>
                        <p className="text-sm text-gray-600">{catering.slug}</p>
                      </div>
                      {isPartner(catering.id) ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Heart className="w-3 h-3 mr-1" />
                          Partner
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleOpenOfferDialog(catering)}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Teklif Gönder
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {searchResults.length === 0 && searchTerm && !searchLoading && (
                    <div className="text-center py-8">
                      <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">Catering firması bulunamadı</p>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </>
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

      {/* Search Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Catering firması ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Partner Caterings */}
      {partnerships.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Heart className="w-5 h-5 mr-2 text-red-500" />
            Partner Catering Firmaları ({partnerships.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partnerships.map((partnership) => {
              const catering = caterings.find(c => c.id === partnership.catering_id);
              if (!catering) return null;
              
              return (
                <Card key={partnership.id} className="hover:shadow-md transition-shadow border-green-200">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{catering.name}</CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <Badge className="bg-green-100 text-green-800">
                            <Heart className="w-3 h-3 mr-1" />
                            Partner
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Değerlendirme:</span>
                        {renderRating(catering.rating)}
                      </div>
                      
                      {partnership.created_at && (
                        <div className="text-sm text-gray-600">
                          Ortaklık: {new Date(partnership.created_at).toLocaleDateString('tr-TR')}
                        </div>
                      )}
                      
                      {canManageCaterings() && (
                        <div className="flex space-x-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleViewCateringDetail(catering)}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Detay
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemovePartnership(partnership.id)}
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <HeartOff className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All Caterings */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Building2 className="w-5 h-5 mr-2" />
          Tüm Catering Firmaları ({filteredCaterings.length})
        </h3>
        
        {filteredCaterings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Catering firması bulunamadı</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCaterings.map((catering) => {
              const partnership = getPartnershipStatus(catering.id);
              const isPartnerCatering = isPartner(catering.id);
              
              return (
                <Card key={catering.id} className={`hover:shadow-md transition-shadow ${isPartnerCatering ? 'border-green-200 bg-green-50' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{catering.name}</CardTitle>
                        <CardDescription>@{catering.slug}</CardDescription>
                      </div>
                      {isPartnerCatering && (
                        <Badge className="bg-green-100 text-green-800">
                          <Heart className="w-3 h-3 mr-1" />
                          Partner
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Değerlendirme:</span>
                        {renderRating(catering.rating)}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        <span>Catering Hizmeti</span>
                      </div>
                      
                      {canManageCaterings() && (
                        <div className="flex space-x-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleViewCateringDetail(catering)}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Detay
                          </Button>
                          {!isPartnerCatering ? (
                            <Button
                              size="sm"
                              onClick={() => handleOpenOfferDialog(catering)}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Teklif Gönder
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemovePartnership(partnership.id)}
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                            >
                              <HeartOff className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CateringManagement;