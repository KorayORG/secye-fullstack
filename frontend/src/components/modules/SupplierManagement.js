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
  Ban,
  Store,
  Plus,
  Minus,
  Phone,
  MapPin,
  Building2,
  Star,
  Users,
  DollarSign
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SupplierManagement = ({ companyId, userRole }) => {
  const [loading, setLoading] = useState(true);
  const [partnerships, setPartnerships] = useState([]);
  const [supplierCompanies, setSupplierCompanies] = useState([]);
  const [allSupplierCompanies, setAllSupplierCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'agreements'
  
  // Shopping states
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showStoreDialog, setShowStoreDialog] = useState(false);
  const [storeProducts, setStoreProducts] = useState([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [cart, setCart] = useState({});
  
  // Termination states
  const [showTerminationDialog, setShowTerminationDialog] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
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
      // Load all supplier companies
      const allSuppliersResponse = await axios.get(`${API}/companies`, {
        params: {
          type: 'supplier',
          limit: 100
        }
      });
      
      setAllSupplierCompanies(allSuppliersResponse.data.companies || []);
      
      // Get partnerships where this catering company is the partner
      const partnershipsResponse = await axios.get(`${API}/partnerships`, {
        params: {
          catering_id: companyId,
          partnership_type: 'supplier'
        }
      });
      
      const partnershipData = partnershipsResponse.data.partnerships || [];
      setPartnerships(partnershipData);
      
      // Get details for each supplier company that we have partnerships with
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
      console.error('Data loading error:', err);
      setError('Veriler yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStore = async (supplier) => {
    setSelectedSupplier(supplier);
    setShowStoreDialog(true);
    setStoreLoading(true);
    setCart({}); // Reset cart
    
    try {
      const response = await axios.get(`${API}/catering/${companyId}/suppliers/${supplier.id}/products`);
      setStoreProducts(response.data.products || []);
    } catch (err) {
      console.error('Store products loading error:', err);
      setError('Mağaza ürünleri yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setStoreLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    const currentQuantity = cart[product.id] || 0;
    const newQuantity = currentQuantity + product.minimum_order_quantity;
    
    if (newQuantity <= product.stock_quantity) {
      setCart({
        ...cart,
        [product.id]: newQuantity
      });
    } else {
      setError(`Stok yetersiz! Maksimum ${product.stock_quantity} ${product.unit_type} sipariş verebilirsiniz.`);
    }
  };

  const handleRemoveFromCart = (product) => {
    const currentQuantity = cart[product.id] || 0;
    const newQuantity = currentQuantity - product.minimum_order_quantity;
    
    if (newQuantity <= 0) {
      const newCart = { ...cart };
      delete newCart[product.id];
      setCart(newCart);
    } else {
      setCart({
        ...cart,
        [product.id]: newQuantity
      });
    }
  };

  const getCartTotal = () => {
    return storeProducts.reduce((total, product) => {
      const quantity = cart[product.id] || 0;
      return total + (quantity * product.unit_price);
    }, 0);
  };

  const getCartItemCount = () => {
    return Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  };

  const handleOpenTerminationDialog = (supplier) => {
    setSelectedPartner(supplier);
    setTerminationForm({ reason: '', message: '' });
    setShowTerminationDialog(true);
  };

  const handleSendTerminationRequest = async () => {
    if (!selectedPartner || !selectedPartner.partnership_id) return;

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
        partnership_id: selectedPartner.partnership_id,
        reason: terminationForm.reason,
        message: terminationForm.message
      });
      
      setSuccess(`${selectedPartner.name} ile anlaşma fesih talebi gönderildi`);
      setShowTerminationDialog(false);
      setTerminationForm({ reason: '', message: '' });
      setSelectedPartner(null);
      loadData(); // Reload to reflect changes
      
    } catch (err) {
      console.error('Termination request error:', err);
      setError('Fesih talebi gönderilirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTerminationLoading(false);
    }
  };

  // Filtered data based on active tab and search
  const getFilteredSuppliers = () => {
    const suppliers = activeTab === 'all' ? allSupplierCompanies : supplierCompanies;
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredSuppliers = getFilteredSuppliers();

  const canManageSuppliers = () => {
    return userRole && (userRole.includes('Owner') || userRole.includes('4') || userRole.includes('3'));
  };

  const isPartner = (supplierId) => {
    return partnerships.some(p => p.supplier_id === supplierId && p.is_active);
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
      {/* Header with Tabs */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tedarikçiler</h2>
        <p className="text-gray-600">Tüm tedarikçileri görüntüleyin ve mağazalarında alışveriş yapın</p>
        
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
              Tüm Tedarikçiler
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                {allSupplierCompanies.length}
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
              Anlaşmalı Tedarikçiler
              <span className="ml-2 bg-green-100 text-green-800 py-0.5 px-2.5 rounded-full text-xs font-medium">
                {supplierCompanies.length}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Store Dialog */}
      <Dialog open={showStoreDialog} onOpenChange={setShowStoreDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Store className="w-5 h-5 mr-2" />
              {selectedSupplier?.name} - Mağaza
            </DialogTitle>
            <DialogDescription>
              Professional mağaza deneyimi ile alışveriş yapın
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col max-h-[70vh]">
            {/* Store Header */}
            <div className="border-b pb-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedSupplier?.name}</h3>
                  {selectedSupplier?.address && (
                    <p className="text-sm text-gray-600 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {selectedSupplier.address.text || selectedSupplier.address}
                    </p>
                  )}
                  {selectedSupplier?.phone && (
                    <p className="text-sm text-gray-600 flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      {selectedSupplier.phone}
                    </p>
                  )}
                </div>
                
                {/* Cart Summary */}
                {getCartItemCount() > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <ShoppingCart className="w-5 h-5 text-green-600 mr-2" />
                      <div>
                        <p className="font-medium text-green-800">
                          {getCartItemCount()} ürün - ₺{getCartTotal().toFixed(2)}
                        </p>
                        <p className="text-sm text-green-600">Sepetinizde</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto">
              {storeLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Ürünler yükleniyor...</p>
                  </div>
                </div>
              ) : storeProducts.length === 0 ? (
                <div className="text-center p-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Ürün Bulunmuyor</h3>
                  <p className="text-sm text-gray-500">Bu mağazada henüz ürün bulunmamaktadır</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storeProducts.map((product) => {
                    const inCart = cart[product.id] || 0;
                    return (
                      <Card key={product.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{product.name}</h4>
                              <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                              {product.category && (
                                <Badge variant="outline" className="mt-1">{product.category}</Badge>
                              )}
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-lg font-semibold text-green-600">
                                  ₺{product.unit_price.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500">/{product.unit_type}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Stok: {product.stock_quantity}</p>
                                <p className="text-xs text-gray-500">Min: {product.minimum_order_quantity}</p>
                              </div>
                            </div>
                            
                            {inCart > 0 ? (
                              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRemoveFromCart(product)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="font-medium text-green-800">
                                  {inCart} {product.unit_type}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddToCart(product)}
                                  className="h-8 w-8 p-0"
                                  disabled={inCart >= product.stock_quantity}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleAddToCart(product)}
                                className="w-full"
                                disabled={product.stock_quantity < product.minimum_order_quantity}
                              >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Sepete Ekle
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Checkout Footer */}
            {getCartItemCount() > 0 && (
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-semibold">
                      Toplam: ₺{getCartTotal().toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {getCartItemCount()} ürün sepetinizde
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setCart({})}>
                      Sepeti Temizle
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Sipariş Ver
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Termination Dialog */}
      <Dialog open={showTerminationDialog} onOpenChange={setShowTerminationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <Ban className="w-5 h-5 mr-2" />
              Anlaşma Feshi
            </DialogTitle>
            <DialogDescription>
              {selectedPartner?.name} ile anlaşmayı feshetmek istiyorsunuz
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
      {(allSupplierCompanies.length > 0 || supplierCompanies.length > 0) && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder={`${activeTab === 'all' ? 'Tüm' : 'Anlaşmalı'} tedarikçiler içinde ara...`}
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
              {activeTab === 'all' ? (
                allSupplierCompanies.length === 0 ? (
                  <>
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Henüz Tedarikçi Yok</h3>
                    <p className="text-sm text-gray-500">
                      Sistemde kayıtlı tedarikçi bulunmamaktadır
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500">Arama kriterinize uygun tedarikçi bulunamadı</p>
                  </>
                )
              ) : (
                supplierCompanies.length === 0 ? (
                  <>
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Henüz Anlaşmalı Tedarikçi Yok</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Tedarikçilerden gelen teklifleri kabul ettiğinizde burada görünecekler
                    </p>
                    <div className="inline-flex items-center text-sm text-blue-600">
                      <Heart className="w-4 h-4 mr-1" />
                      <span>Teklifler sekmesinden gelen teklifleri kontrol edin</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500">Arama kriterinize uygun anlaşmalı tedarikçi bulunamadı</p>
                  </>
                )
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => {
              const isPartnerSupplier = isPartner(supplier.id);
              return (
                <Card key={supplier.id} className={`hover:shadow-md transition-shadow ${
                  isPartnerSupplier ? 'border-green-200 bg-green-50' : 'border-gray-200'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center">
                          <Truck className={`w-5 h-5 mr-2 ${
                            isPartnerSupplier ? 'text-green-600' : 'text-orange-600'
                          }`} />
                          {supplier.name}
                        </CardTitle>
                        <CardDescription>@{supplier.slug}</CardDescription>
                      </div>
                      {isPartnerSupplier ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Heart className="w-3 h-3 mr-1" />
                          Anlaşmalı
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Tedarikçi
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {supplier.address && (
                        <div className="flex items-start justify-between">
                          <span className="text-sm text-gray-600">Konum:</span>
                          <div className="flex items-center text-sm font-medium max-w-32 text-right">
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">
                              {supplier.address.text || supplier.address}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {supplier.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Telefon:</span>
                          <span className="font-medium flex items-center">
                            <Phone className="w-4 h-4 mr-1" />
                            {supplier.phone}
                          </span>
                        </div>
                      )}
                      
                      {isPartnerSupplier && supplier.partnership_created_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Anlaşma Tarihi:</span>
                          <span className="font-medium flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(supplier.partnership_created_at).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Kayıt Tarihi:</span>
                        <span className="font-medium flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(supplier.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      
                      {canManageSuppliers() && (
                        <div className="flex space-x-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleOpenStore(supplier)}
                          >
                            <Store className="w-4 h-4 mr-1" />
                            Mağazaya Git
                          </Button>
                          {isPartnerSupplier && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenTerminationDialog(supplier)}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierManagement;