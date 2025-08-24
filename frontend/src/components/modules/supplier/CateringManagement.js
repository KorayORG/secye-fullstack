import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Alert, AlertDescription } from '../../ui/alert';
import { 
  Building2, 
  Users, 
  Search, 
  Phone,
  MapPin,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  User,
  Calendar,
  Mail
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CateringManagement = ({ companyId, userRole }) => {
  const [loading, setLoading] = useState(true);
  const [caterings, setCaterings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [selectedCatering, setSelectedCatering] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    loadCaterings();
  }, [companyId]);

  const loadCaterings = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API}/companies`, {
        params: {
          type: 'catering',
          limit: 100
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

  const handleViewDetails = (catering) => {
    setSelectedCatering(catering);
    setShowDetailDialog(true);
  };

  const filteredCaterings = caterings.filter(catering =>
    catering.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Catering Firmaları</h2>
        <p className="text-gray-600">Sistemdeki tüm catering firmalarını görüntüleyin</p>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCatering?.name} - Detayları
            </DialogTitle>
            <DialogDescription>
              Catering firması hakkında detaylı bilgiler
            </DialogDescription>
          </DialogHeader>
          
          {selectedCatering && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Şirket Adı:</span>
                  <span className="font-medium">{selectedCatering.name}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Kullanıcı Adı:</span>
                  <span className="font-medium">@{selectedCatering.slug}</span>
                </div>
                
                {selectedCatering.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Telefon:</span>
                    <span className="font-medium flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      {selectedCatering.phone}
                    </span>
                  </div>
                )}
                
                {selectedCatering.address && (
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-gray-600">Adres:</span>
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
                      <span className="font-medium text-sm">
                        {selectedCatering.address.text || selectedCatering.address}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Kayıt Tarihi:</span>
                  <span className="font-medium flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(selectedCatering.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Durum:</span>
                  <Badge className={selectedCatering.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {selectedCatering.is_active ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>
                
                {selectedCatering.counts && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Çalışan Sayısı:</span>
                    <span className="font-medium flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {(selectedCatering.counts.individual || 0) + (selectedCatering.counts.corporate || 0)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDetailDialog(false)}
                >
                  Kapat
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
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

      {/* Catering Companies List */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Building2 className="w-5 h-5 mr-2" />
          Tüm Catering Firmaları ({filteredCaterings.length})
        </h3>
        
        {filteredCaterings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                {caterings.length === 0 ? 'Henüz Catering Firması Yok' : 'Arama Sonucu Bulunamadı'}
              </h3>
              <p className="text-sm text-gray-500">
                {caterings.length === 0 
                  ? 'Sistemde kayıtlı catering firması bulunmamaktadır' 
                  : 'Arama kriterinize uygun catering firması bulunamadı'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCaterings.map((catering) => (
              <Card key={catering.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center">
                        <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                        {catering.name}
                      </CardTitle>
                      <CardDescription>@{catering.slug}</CardDescription>
                    </div>
                    <Badge className={catering.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {catering.is_active ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {catering.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Telefon:</span>
                        <span className="font-medium flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          {catering.phone}
                        </span>
                      </div>
                    )}
                    
                    {catering.address && (
                      <div className="flex items-start justify-between">
                        <span className="text-sm text-gray-600">Konum:</span>
                        <div className="flex items-center text-sm font-medium max-w-32 text-right">
                          <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">
                            {catering.address.text || catering.address || 'Belirtilmemiş'}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {catering.counts && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Çalışan:</span>
                        <span className="font-medium flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {(catering.counts.individual || 0) + (catering.counts.corporate || 0)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Kayıt:</span>
                      <span className="font-medium flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(catering.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    
                    <div className="pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleViewDetails(catering)}
                        className="w-full"
                        variant="outline"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Detayları Görüntüle
                      </Button>
                    </div>
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

export default CateringManagement;