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
  Truck, 
  Package, 
  Calendar,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ShoppingCart,
  Heart,
  Clock,
  Ban
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SupplierManagement = ({ companyId, userRole }) => {
  const [loading, setLoading] = useState(true);
  const [partnerships, setPartnerships] = useState([]);
  const [supplierCompanies, setSupplierCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Termination states
  const [showTerminationDialog, setShowTerminationDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [terminationForm, setTerminationForm] = useState({
    reason: '',
    message: ''
  });
  const [terminationLoading, setTerminationLoading] = useState(false);

  useEffect(() => {
    loadPartnerships();
  }, [companyId]);

  const loadPartnerships = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get partnerships where this catering company is partnered with suppliers
      const partnershipsResponse = await axios.get(`${API}/partnerships`, {
        params: {
          catering_id: companyId,
          partnership_type: 'supplier'
        }
      });
      
      const partnershipData = partnershipsResponse.data.partnerships || [];
      setPartnerships(partnershipData);
      
      // Get details for each supplier company
      const supplierDetails = [];
      for (const partnership of partnershipData) {
        if (partnership.supplier_id && partnership.is_active) {
          try {
            const supplierResponse = await axios.get(`${API}/companies/${partnership.supplier_id}`);
            if (supplierResponse.data) {
              supplierDetails.push({
                ...supplierResponse.data,
                partnership_id: partnership.id,
                partnership_created_at: partnership.created_at
              });
            }
          } catch (err) {
            console.error(`Error loading supplier company ${partnership.supplier_id}:`, err);
          }
        }
      }
      
      setSupplierCompanies(supplierDetails);
      
    } catch (err) {
      console.error('Supplier partnerships loading error:', err);
      setError('Tedarikçi ortaklıkları yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTerminationDialog = (supplier) => {
    setSelectedSupplier(supplier);
    setTerminationForm({ reason: '', message: '' });
    setShowTerminationDialog(true);
  };

  const handleSendTerminationRequest = async () => {
    if (!selectedSupplier || !selectedSupplier.partnership_id) return;

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
        partnership_id: selectedSupplier.partnership_id,
        reason: terminationForm.reason,
        message: terminationForm.message
      });
      
      setSuccess(`${selectedSupplier.name} ile anlaşma fesih talebi gönderildi`);
      setShowTerminationDialog(false);
      setTerminationForm({ reason: '', message: '' });
      setSelectedSupplier(null);
      loadPartnerships(); // Reload to reflect changes
      
    } catch (err) {
      console.error('Termination request error:', err);
      setError('Fesih talebi gönderilirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTerminationLoading(false);
    }
  };

  const getSupplierCategory = (supplier) => {
    // This would normally come from the supplier data
    // For now, we'll categorize based on the name or use default categories
    const categories = [
      'Taze Ürünler', 'Et Ürünleri', 'Baklagil & Tahıl', 
      'Süt Ürünleri', 'Baharat & Şerbetçi Otu', 'Temizlik Malzemeleri'
    ];
    
    return categories[Math.floor(Math.random() * categories.length)];
  };

  const getLastOrderDate = (supplier) => {
    // This would come from actual order data
    // For now, we'll generate a random recent date
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const lastOrder = new Date();
    lastOrder.setDate(lastOrder.getDate() - daysAgo);
    
    if (daysAgo === 1) return '1 gün önce';
    if (daysAgo < 7) return `${daysAgo} gün önce`;
    if (daysAgo < 14) return '1 hafta önce';
    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} hafta önce`;
    return '1 ay önce';
  };

  const filteredSuppliers = supplierCompanies.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManageSuppliers = () => {
    return userRole && (userRole.includes('Owner') || userRole.includes('4') || userRole.includes('3'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Tedarikçiler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tedarikçi Yönetimi</h2>
        <p className="text-gray-600">Anlaşmalı tedarikçilerinizi görüntüleyin ve sipariş verin</p>
      </div>

      {/* Termination Dialog */}
      <Dialog open={showTerminationDialog} onOpenChange={setShowTerminationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <Ban className="w-5 h-5 mr-2" />
              Tedarikçi Anlaşması Feshi
            </DialogTitle>
            <DialogDescription>
              {selectedSupplier?.name} ile anlaşmayı feshetmek istiyorsunuz
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Fesih Nedeni (Zorunlu)</Label>
              <Input
                id="reason"
                placeholder="Örn: Kalite sorunu, teslimat gecikmeleri..."
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
      {supplierCompanies.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Tedarikçi ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suppliers List */}
      <div>
        {filteredSuppliers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              {supplierCompanies.length === 0 ? (
                <>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Henüz Anlaşmalı Tedarikçi Yok</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Tedarikçilerle anlaşma yaparak malzeme tedarik sürecinizi optimize edin
                  </p>
                  <div className="inline-flex items-center text-sm text-blue-600">
                    <Package className="w-4 h-4 mr-1" />
                    <span>Yeni tedarikçilerle anlaşma yapmak için iletişime geçin</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-500">Arama kriterinize uygun tedarikçi bulunamadı</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => (
              <Card key={supplier.id} className="hover:shadow-md transition-shadow border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center">
                        <Truck className="w-5 h-5 mr-2 text-blue-600" />
                        {supplier.name}
                      </CardTitle>
                      <CardDescription>@{supplier.slug}</CardDescription>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      <Heart className="w-3 h-3 mr-1" />
                      Anlaşmalı
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Kategori:</span>
                      <span className="font-medium flex items-center">
                        <Package className="w-4 h-4 mr-1" />
                        {getSupplierCategory(supplier)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Son Sipariş:</span>
                      <span className="font-medium flex items-center">
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        {getLastOrderDate(supplier)}
                      </span>
                    </div>
                    
                    {supplier.partnership_created_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Anlaşma Tarihi:</span>
                        <span className="font-medium flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(supplier.partnership_created_at).toLocaleDateString('tr-TR')}
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
                    
                    {canManageSuppliers() && (
                      <div className="flex space-x-2 pt-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                        >
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          Sipariş Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Detay
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenTerminationDialog(supplier)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Ban className="w-4 h-4" />
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

export default SupplierManagement;