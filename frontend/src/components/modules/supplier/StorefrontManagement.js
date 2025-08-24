import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Alert, AlertDescription } from '../../ui/alert';
import { 
  Package, 
  Plus, 
  Search, 
  ShoppingCart,
  TrendingUp,
  Calendar,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Clock,
  Truck,
  DollarSign,
  Tag,
  AlertCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UNIT_TYPES = [
  { value: 'gram', label: 'Gram (gr)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'litre', label: 'Litre (L)' },
  { value: 'ml', label: 'Mililitre (mL)' },
  { value: 'adet', label: 'Adet' },
  { value: 'ton', label: 'Ton' },
  { value: 'paket', label: 'Paket' },
  { value: 'kutu', label: 'Kutu' }
];

const StorefrontManagement = ({ companyId, userRole }) => {
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Product form states
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    unit_type: 'adet',
    unit_price: '',
    stock_quantity: '',
    minimum_order_quantity: '1',
    category: ''
  });
  const [productLoading, setProductLoading] = useState(false);
  
  // Order states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderFilter, setOrderFilter] = useState('all');
  
  // Stats states
  const [statsPeriod, setStatsPeriod] = useState('1_month');

  useEffect(() => {
    loadProducts();
    loadStats();
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [companyId, activeTab, statsPeriod]);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API}/supplier/${companyId}/products`);
      setProducts(response.data.products || []);
    } catch (err) {
      console.error('Products loading error:', err);
      setError('Ürünler yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await axios.get(`${API}/supplier/${companyId}/orders`, {
        params: orderFilter !== 'all' ? { status_filter: orderFilter } : {}
      });
      setOrders(response.data.orders || []);
    } catch (err) {
      console.error('Orders loading error:', err);
      setError('Siparişler yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API}/supplier/${companyId}/stats`, {
        params: { period: statsPeriod }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Stats loading error:', err);
      // Don't show error for stats as it's not critical
    }
  };

  const handleOpenProductDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description,
        unit_type: product.unit_type,
        unit_price: product.unit_price.toString(),
        stock_quantity: product.stock_quantity.toString(),
        minimum_order_quantity: product.minimum_order_quantity.toString(),
        category: product.category || ''
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        unit_type: 'adet',
        unit_price: '',
        stock_quantity: '',
        minimum_order_quantity: '1',
        category: ''
      });
    }
    setShowProductDialog(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim() || !productForm.unit_price || !productForm.stock_quantity) {
      setError('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    if (parseFloat(productForm.unit_price) <= 0) {
      setError('Birim fiyat 0\'dan büyük olmalıdır');
      return;
    }

    if (parseInt(productForm.stock_quantity) < 0) {
      setError('Stok miktarı negatif olamaz');
      return;
    }

    setProductLoading(true);
    setError('');
    setSuccess('');

    try {
      const productData = {
        name: productForm.name,
        description: productForm.description,
        unit_type: productForm.unit_type,
        unit_price: parseFloat(productForm.unit_price),
        stock_quantity: parseInt(productForm.stock_quantity),
        minimum_order_quantity: parseInt(productForm.minimum_order_quantity || 1),
        category: productForm.category || null
      };

      if (editingProduct) {
        await axios.put(`${API}/supplier/${companyId}/products/${editingProduct.id}`, productData);
        setSuccess('Ürün başarıyla güncellendi');
      } else {
        await axios.post(`${API}/supplier/${companyId}/products`, productData);
        setSuccess('Ürün başarıyla eklendi');
      }
      
      setShowProductDialog(false);
      setEditingProduct(null);
      loadProducts();
      loadStats(); // Refresh stats
      
    } catch (err) {
      console.error('Product save error:', err);
      setError('Ürün kaydedilirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setProductLoading(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`"${productName}" ürününü silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/supplier/${companyId}/products/${productId}`);
      setSuccess('Ürün başarıyla silindi');
      loadProducts();
      loadStats();
    } catch (err) {
      console.error('Product delete error:', err);
      setError('Ürün silinirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/supplier/${companyId}/orders/${orderId}`, {
        status: newStatus
      });
      setSuccess(`Sipariş durumu "${getStatusLabel(newStatus)}" olarak güncellendi`);
      loadOrders();
      loadStats();
    } catch (err) {
      console.error('Order status update error:', err);
      setError('Sipariş durumu güncellenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Bekliyor',
      'confirmed': 'Onaylandı', 
      'preparing': 'Hazırlanıyor',
      'delivered': 'Teslim Edildi',
      'cancelled': 'İptal Edildi'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'preparing': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter(order => {
    if (orderFilter === 'all') return true;
    return order.status === orderFilter;
  });

  const canManageProducts = () => {
    return userRole && (userRole.includes('Owner') || userRole.includes('4') || userRole.includes('3'));
  };

  if (loading && activeTab === 'products') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Mağaza yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mağazam</h2>
        <p className="text-gray-600">Ürünlerinizi yönetin, siparişleri takip edin ve istatistikleri görüntüleyin</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products">Ürünler</TabsTrigger>
          <TabsTrigger value="stock">Stok Takip</TabsTrigger>
          <TabsTrigger value="stats">İstatistikler</TabsTrigger>
          <TabsTrigger value="orders">Siparişler</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 min-w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Ürün ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {canManageProducts() && (
              <Button onClick={() => handleOpenProductDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Ürün Ekle
              </Button>
            )}
          </div>

          {/* Product Dialog */}
          <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
                </DialogTitle>
                <DialogDescription>
                  Ürün bilgilerini doldurun
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ürün Başlığı *</Label>
                  <Input
                    id="name"
                    placeholder="Örn: Premium Domates"
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Ürün Açıklaması *</Label>
                  <Textarea
                    id="description"
                    placeholder="Ürün hakkında detaylı açıklama..."
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit_type">Birim *</Label>
                    <Select
                      value={productForm.unit_type}
                      onValueChange={(value) => setProductForm({...productForm, unit_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_TYPES.map(unit => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Birim Fiyat (₺) *</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={productForm.unit_price}
                      onChange={(e) => setProductForm({...productForm, unit_price: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock_quantity">Stok Miktarı *</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={productForm.stock_quantity}
                      onChange={(e) => setProductForm({...productForm, stock_quantity: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="minimum_order_quantity">Min. Sipariş Miktarı</Label>
                    <Input
                      id="minimum_order_quantity"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={productForm.minimum_order_quantity}
                      onChange={(e) => setProductForm({...productForm, minimum_order_quantity: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori (İsteğe bağlı)</Label>
                  <Input
                    id="category"
                    placeholder="Örn: Sebze, Meyve, Et"
                    value={productForm.category}
                    onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowProductDialog(false)}
                    disabled={productLoading}
                  >
                    İptal
                  </Button>
                  <Button 
                    onClick={handleSaveProduct}
                    disabled={productLoading}
                  >
                    {productLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      'Kaydet'
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

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  {products.length === 0 ? 'Henüz Ürün Yok' : 'Arama Sonucu Bulunamadı'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {products.length === 0 
                    ? 'Mağazanızda satmak için ürün eklemeye başlayın' 
                    : 'Arama kriterinize uygun ürün bulunamadı'
                  }
                </p>
                {products.length === 0 && canManageProducts() && (
                  <Button onClick={() => handleOpenProductDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    İlk Ürününüzü Ekleyin
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{product.description}</CardDescription>
                      </div>
                      <Badge className={product.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {product.is_active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Birim Fiyat:</span>
                        <span className="font-semibold text-green-600">
                          ₺{product.unit_price.toFixed(2)}/{product.unit_type}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Stok:</span>
                        <span className={`font-medium ${product.stock_quantity < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                          {product.stock_quantity} {product.unit_type}
                          {product.stock_quantity < 10 && (
                            <AlertCircle className="w-4 h-4 inline ml-1" />
                          )}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Min. Sipariş:</span>
                        <span className="font-medium">
                          {product.minimum_order_quantity} {product.unit_type}
                        </span>
                      </div>
                      
                      {product.category && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Kategori:</span>
                          <Badge variant="outline">{product.category}</Badge>
                        </div>
                      )}
                      
                      {canManageProducts() && (
                        <div className="flex space-x-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleOpenProductDialog(product)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Düzenle
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Sil
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

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Siparişler</h3>
              <p className="text-gray-600">Gelen siparişleri yönetin</p>
            </div>
            <Select value={orderFilter} onValueChange={setOrderFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Siparişler</SelectItem>
                <SelectItem value="pending">Bekleyenler</SelectItem>
                <SelectItem value="confirmed">Onaylananlar</SelectItem>
                <SelectItem value="preparing">Hazırlananlar</SelectItem>
                <SelectItem value="delivered">Teslim Edilenler</SelectItem>
                <SelectItem value="cancelled">İptal Edilenler</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Order Detail Dialog */}
          <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Sipariş Detayları - #{selectedOrder?.id?.slice(-8)}
                </DialogTitle>
                <DialogDescription>
                  {selectedOrder?.catering_company_name} sipariş detayları
                </DialogDescription>
              </DialogHeader>
              
              {selectedOrder && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Sipariş Bilgileri</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Müşteri:</span>
                          <span>{selectedOrder.catering_company_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Durum:</span>
                          <Badge className={getStatusColor(selectedOrder.status)}>
                            {getStatusLabel(selectedOrder.status)}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Toplam Tutar:</span>
                          <span className="font-semibold">₺{selectedOrder.total_amount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sipariş Tarihi:</span>
                          <span>{new Date(selectedOrder.created_at).toLocaleString('tr-TR')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Teslimat Bilgileri</h4>
                      <div className="space-y-2 text-sm">
                        {selectedOrder.delivery_address && (
                          <div>
                            <span className="text-gray-600">Adres:</span>
                            <p className="text-sm mt-1">{selectedOrder.delivery_address}</p>
                          </div>
                        )}
                        {selectedOrder.delivery_date && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Teslimat Tarihi:</span>
                            <span>{new Date(selectedOrder.delivery_date).toLocaleString('tr-TR')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {selectedOrder.notes && (
                    <div>
                      <h4 className="font-medium mb-2">Notlar</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedOrder.notes}</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium mb-2">Sipariş Ürünleri</h4>
                    <div className="space-y-2">
                      {selectedOrder.items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-gray-600">
                              {item.quantity} {item.product_unit_type} × ₺{item.unit_price?.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">₺{item.total_price?.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {selectedOrder.status === 'pending' && (
                    <div className="flex space-x-2 pt-4">
                      <Button 
                        onClick={() => {
                          handleUpdateOrderStatus(selectedOrder.id, 'confirmed');
                          setShowOrderDialog(false);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Siparişi Onayla
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          handleUpdateOrderStatus(selectedOrder.id, 'cancelled');
                          setShowOrderDialog(false);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        Siparişi İptal Et
                      </Button>
                    </div>
                  )}
                  
                  {selectedOrder.status === 'confirmed' && (
                    <div className="flex space-x-2 pt-4">
                      <Button 
                        onClick={() => {
                          handleUpdateOrderStatus(selectedOrder.id, 'preparing');
                          setShowOrderDialog(false);
                        }}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Hazırlanıyor Olarak İşaretle
                      </Button>
                    </div>
                  )}
                  
                  {selectedOrder.status === 'preparing' && (
                    <div className="flex space-x-2 pt-4">
                      <Button 
                        onClick={() => {
                          handleUpdateOrderStatus(selectedOrder.id, 'delivered');
                          setShowOrderDialog(false);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Teslim Edildi Olarak İşaretle
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">Henüz Sipariş Yok</h3>
                <p className="text-sm text-gray-500">
                  Catering firmalarından gelen siparişler burada görünecektir
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => { setSelectedOrder(order); setShowOrderDialog(true); }}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold">#{order.id.slice(-8)}</h3>
                          <Badge className={`ml-2 ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-1">{order.catering_company_name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-green-600">
                          ₺{order.total_amount?.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.items?.length || 0} ürün
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">İstatistikler</h3>
              <p className="text-gray-600">Mağazanızın performansını görüntüleyin</p>
            </div>
            <Select value={statsPeriod} onValueChange={setStatsPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1_day">Son 1 Gün</SelectItem>
                <SelectItem value="1_week">Son 1 Hafta</SelectItem>
                <SelectItem value="1_month">Son 1 Ay</SelectItem>
                <SelectItem value="1_year">Son 1 Yıl</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <ShoppingCart className="w-8 h-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Toplam Sipariş</p>
                      <p className="text-2xl font-semibold">{stats.total_orders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <DollarSign className="w-8 h-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Toplam Gelir</p>
                      <p className="text-2xl font-semibold">₺{stats.total_revenue?.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Truck className="w-8 h-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Teslim Edilenler</p>
                      <p className="text-2xl font-semibold">{stats.delivered_orders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="w-8 h-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Bekleyenler</p>
                      <p className="text-2xl font-semibold">{stats.pending_orders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Package className="w-8 h-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Toplam Ürün</p>
                      <p className="text-2xl font-semibold">{stats.total_products}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Az Stoklu Ürün</p>
                      <p className="text-2xl font-semibold">{stats.low_stock_products}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {stats?.low_stock_items?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Stok Uyarısı
                </CardTitle>
                <CardDescription>
                  Stok miktarı düşük olan ürünler
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.low_stock_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200">
                      <span className="font-medium">{item.name}</span>
                      <Badge className="bg-red-100 text-red-800">
                        {item.stock_quantity} adet kaldı
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StorefrontManagement;