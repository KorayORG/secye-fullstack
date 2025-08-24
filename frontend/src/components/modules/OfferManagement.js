import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  TrendingUp,
  MessageSquare,
  Loader2,
  AlertTriangle,
  Calendar,
  Timer,
  Ban
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OfferManagement = ({ companyId, userRole, companyType }) => {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('received');
  const [showTerminationDialog, setShowTerminationDialog] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [terminationForm, setTerminationForm] = useState({
    reason: '',
    message: '',
    termination_date: ''
  });

  useEffect(() => {
    loadOffers();
  }, [companyId, activeTab]);

  const loadOffers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const endpoint = companyType === 'catering' 
        ? `${API}/catering/${companyId}/offers`
        : `${API}/corporate/${companyId}/offers`;
      
      const response = await axios.get(endpoint, {
        params: {
          offer_type: activeTab,
          limit: 50
        }
      });
      
      setOffers(response.data.offers || []);
    } catch (err) {
      console.error('Offers loading error:', err);
      setError('Teklifler yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
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
        action: action
      });
      
      setSuccess(`Teklif ${action === 'accept' ? 'kabul edildi' : 'reddedildi'}`);
      loadOffers();
    } catch (err) {
      console.error('Offer response error:', err);
      setError('Teklif yanıtlanırken hata oluştu: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      sent: { label: 'Gönderildi', className: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Kabul Edildi', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Reddedildi', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status] || statusConfig.sent;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const canManageOffers = () => {
    return userRole && (userRole.includes('Owner') || userRole.includes('4') || userRole.includes('3'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Teklifler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Teklifler</h2>
        <p className="text-gray-600">
          {companyType === 'catering' 
            ? 'Firmalardan gelen teklifleri inceleyin ve yanıtlayın' 
            : 'Catering firmalarına gönderdiğiniz teklifleri takip edin'}
        </p>
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="received" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Gelen Teklifler</span>
          </TabsTrigger>
          {companyType === 'corporate' && (
            <TabsTrigger value="sent" className="flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>Gönderilen Teklifler</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="received" className="mt-6">
          {offers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Henüz gelen teklif bulunmamaktadır</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {offers.map((offer) => (
                <Card key={offer.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center">
                          {getStatusIcon(offer.status)}
                          <span className="ml-2">
                            {offer.other_company?.name || 'Bilinmeyen Firma'}
                          </span>
                        </CardTitle>
                        <CardDescription className="flex items-center justify-between mt-2">
                          <span>Birim Fiyat Teklifi</span>
                          {getStatusBadge(offer.status)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Price */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
                          <span className="text-sm text-gray-600">Birim Öğün Fiyatı</span>
                        </div>
                        <span className="text-xl font-bold text-green-600">
                          ₺{offer.unit_price.toFixed(2)}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div className="flex items-center">
                          <Timer className="w-5 h-5 text-orange-500 mr-2" />
                          <span className="text-sm text-gray-600">Anlaşma Süresi</span>
                        </div>
                        <span className="text-lg font-bold text-orange-600">
                          {offer.duration_months} Ay
                        </span>
                      </div>

                      {/* Message */}
                      {offer.message && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-start">
                            <MessageSquare className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700">{offer.message}</p>
                          </div>
                        </div>
                      )}

                      {/* Date */}
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(offer.created_at).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>

                      {/* Actions */}
                      {companyType === 'catering' && offer.status === 'sent' && canManageOffers() && (
                        <div className="flex space-x-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleOfferResponse(offer.id, 'accept')}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Kabul Et
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOfferResponse(offer.id, 'reject')}
                            className="flex-1 text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reddet
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {companyType === 'corporate' && (
          <TabsContent value="sent" className="mt-6">
            {offers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Henüz gönderilen teklif bulunmamaktadır</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {offers.map((offer) => (
                  <Card key={offer.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center">
                            {getStatusIcon(offer.status)}
                            <span className="ml-2">
                              {offer.other_company?.name || 'Bilinmeyen Firma'}
                            </span>
                          </CardTitle>
                          <CardDescription className="flex items-center justify-between mt-2">
                            <span>Gönderilen Teklif</span>
                            {getStatusBadge(offer.status)}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Price */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <TrendingUp className="w-5 h-5 text-blue-500 mr-2" />
                            <span className="text-sm text-gray-600">Teklif Edilen Fiyat</span>
                          </div>
                          <span className="text-xl font-bold text-blue-600">
                            ₺{offer.unit_price.toFixed(2)}
                          </span>
                        </div>

                        {/* Duration */}
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center">
                            <Timer className="w-5 h-5 text-orange-500 mr-2" />
                            <span className="text-sm text-gray-600">Anlaşma Süresi</span>
                          </div>
                          <span className="text-lg font-bold text-orange-600">
                            {offer.duration_months} Ay
                          </span>
                        </div>

                        {/* Message */}
                        {offer.message && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-start">
                              <MessageSquare className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-gray-700">{offer.message}</p>
                            </div>
                          </div>
                        )}

                        {/* Date */}
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(offer.created_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>

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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default OfferManagement;