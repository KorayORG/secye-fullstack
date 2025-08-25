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
  AlertCircle,
  Phone,
  MapPin
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
      // API'ye gönderilecek period parametresini backend ile uyumlu hale getir
      let backendPeriod = statsPeriod;
      if (statsPeriod === 'month') backendPeriod = '1_month';
      if (statsPeriod === 'week') backendPeriod = '1_week';
      if (statsPeriod === 'day') backendPeriod = '1_day';
      if (statsPeriod === 'year') backendPeriod = '1_year';
      const response = await axios.get(`${API}/supplier/${companyId}/stats`, {
        params: { period: backendPeriod }
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

        {/* Stock Management Tab */}
        <TabsContent value="stock" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Stok Takip</h3>
              <p className="text-gray-600">Ürünlerinizin mevcut stoklarını profesyonel arayüzle takip edin</p>
            </div>
            <div className="flex space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Ürün ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">Stok Takip Edilecek Ürün Yok</h3>
                <p className="text-sm text-gray-500">
                  Stok takibi için önce ürün eklemeniz gerekiyor
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Stok Durumu
                </CardTitle>
                <CardDescription>
                  Toplam {filteredProducts.length} ürünün stok bilgileri
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3 font-medium text-gray-900">Ürün Adı</th>
                        <th className="text-left p-3 font-medium text-gray-900">Birim</th>
                        <th className="text-left p-3 font-medium text-gray-900">Mevcut Stok</th>
                        <th className="text-left p-3 font-medium text-gray-900">Birim Fiyat</th>
                        <th className="text-left p-3 font-medium text-gray-900">Toplam Değer</th>
                        <th className="text-left p-3 font-medium text-gray-900">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => {
                        const totalValue = product.stock_quantity * product.unit_price;
                        const isLowStock = product.stock_quantity < 10;
                        const isOutOfStock = product.stock_quantity === 0;
                        
                        return (
                          <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-gray-900">{product.name}</p>
                                <p className="text-sm text-gray-500">{product.category}</p>
                              </div>
                            </td>
                            <td className="p-3 text-gray-600">{product.unit_type}</td>
                            <td className="p-3">
                              <span className={`font-medium ${
                                isOutOfStock ? 'text-red-600' : 
                                isLowStock ? 'text-orange-600' : 'text-green-600'
                              }`}>
                                {product.stock_quantity}
                              </span>
                            </td>
                            <td className="p-3 text-gray-600">
                              ₺{product.unit_price.toFixed(2)}
                            </td>
                            <td className="p-3 font-medium text-gray-900">
                              ₺{totalValue.toFixed(2)}
                            </td>
                            <td className="p-3">
                              <Badge className={
                                isOutOfStock ? 'bg-red-100 text-red-800' :
                                isLowStock ? 'bg-orange-100 text-orange-800' : 
                                'bg-green-100 text-green-800'
                              }>
                                {isOutOfStock ? 'Stok Yok' : 
                                 isLowStock ? 'Az Stok' : 'Yeterli'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <Package className="w-6 h-6 text-blue-600" />
                        <div className="ml-3">
                          <p className="text-sm text-gray-600">Toplam Ürün</p>
                          <p className="text-xl font-semibold">{filteredProducts.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                        <div className="ml-3">
                          <p className="text-sm text-gray-600">Az Stoklu Ürün</p>
                          <p className="text-xl font-semibold">
                            {filteredProducts.filter(p => p.stock_quantity < 10 && p.stock_quantity > 0).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <DollarSign className="w-6 h-6 text-green-600" />
                        <div className="ml-3">
                          <p className="text-sm text-gray-600">Toplam Stok Değeri</p>
                          <p className="text-xl font-semibold">
                            ₺{filteredProducts.reduce((total, p) => total + (p.stock_quantity * p.unit_price), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Siparişler</h3>
              <p className="text-gray-600">Teslim edilmemiş ve aktif siparişleri yönetin</p>
            </div>
            <Select value={orderFilter} onValueChange={setOrderFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Siparişler</SelectItem>
                <SelectItem value="pending">Yeni Siparişler</SelectItem>
                <SelectItem value="confirmed">Onayladıklarım</SelectItem>
                <SelectItem value="preparing">Hazırlananlar</SelectItem>
                <SelectItem value="delivered">Teslim Edilenler</SelectItem>
                <SelectItem value="cancelled">İptal Edilenler</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Order Detail Dialog */}
          <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Sipariş Detayları - #{selectedOrder?.id?.slice(-8)}
                </DialogTitle>
                <DialogDescription>
                  {selectedOrder?.catering_company_name} firmasından gelen sipariş detayları
                </DialogDescription>
              </DialogHeader>
              
              {selectedOrder && (
                <div className="space-y-6">
                  {/* Main Order Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer & Order Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Müşteri Bilgileri</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Firma Adı:</span>
                          <span className="font-semibold">{selectedOrder.catering_company_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Telefon:</span>
                          <span className="font-semibold text-blue-600">
                            {selectedOrder.customer_phone || '+90 555 XXX XX XX'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sipariş Tarihi:</span>
                          <span>{new Date(selectedOrder.created_at).toLocaleString('tr-TR')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Durum:</span>
                          <Badge className={getStatusColor(selectedOrder.status)}>
                            {getStatusLabel(selectedOrder.status)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Financial & Delivery Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Teslimat ve Ödeme</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Toplam Tutar:</span>
                          <span className="text-xl font-semibold text-green-600">
                            ₺{selectedOrder.total_amount?.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Teslimat Adresi:</span>
                          <span className="text-right max-w-48">
                            {selectedOrder.delivery_address || 'Firma adresi kullanılacak'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Talep Edilen Tarih:</span>
                          <span>
                            {selectedOrder.delivery_date 
                              ? new Date(selectedOrder.delivery_date).toLocaleDateString('tr-TR')
                              : 'En kısa sürede'
                            }
                          </span>
                        </div>
                        {selectedOrder.notes && (
                          <div>
                            <span className="text-gray-600">Not:</span>
                            <p className="mt-1 p-2 bg-gray-50 rounded text-sm">{selectedOrder.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Order Items Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Sipariş İçeriği</CardTitle>
                      <CardDescription>
                        {selectedOrder.items?.length || 0} farklı ürün sipariş edildi
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left p-3 font-medium text-gray-900">Ürün</th>
                              <th className="text-center p-3 font-medium text-gray-900">Miktar</th>
                              <th className="text-right p-3 font-medium text-gray-900">Birim Fiyat</th>
                              <th className="text-right p-3 font-medium text-gray-900">Toplam</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedOrder.items?.map((item, index) => (
                              <tr key={index} className="border-b border-gray-100">
                                <td className="p-3">
                                  <div>
                                    <p className="font-medium">{item.product_name}</p>
                                    <p className="text-sm text-gray-500">{item.product_unit_type} başına</p>
                                  </div>
                                </td>
                                <td className="p-3 text-center font-medium">
                                  {item.quantity} {item.product_unit_type}
                                </td>
                                <td className="p-3 text-right">₺{item.unit_price?.toFixed(2)}</td>
                                <td className="p-3 text-right font-semibold">
                                  ₺{item.total_price?.toFixed(2)}
                                </td>
                              </tr>
                            )) || (
                              <tr>
                                <td colSpan="4" className="p-6 text-center text-gray-500">
                                  Sipariş içeriği yüklenemedi
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons - Two-Phase Delivery System */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Sipariş İşlemleri</CardTitle>
                      <CardDescription>İki aşamalı teslimat onay sistemi</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedOrder.status === 'pending' && (
                        <div className="flex space-x-3">
                          <Button 
                            onClick={() => {
                              handleUpdateOrderStatus(selectedOrder.id, 'confirmed');
                              setShowOrderDialog(false);
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
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
                        <div className="flex space-x-3">
                          <Button 
                            onClick={() => {
                              handleUpdateOrderStatus(selectedOrder.id, 'preparing');
                              setShowOrderDialog(false);
                            }}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Hazırlanıyor Olarak İşaretle
                          </Button>
                        </div>
                      )}

                      {selectedOrder.status === 'preparing' && (
                        <div className="space-y-4">
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                            <h4 className="font-medium text-yellow-800 mb-2">
                              📋 Teslimat Onay Süreci
                            </h4>
                            <p className="text-sm text-yellow-700 mb-3">
                              Siparişi teslim ettiğinizde, Catering firmasının da onaylaması gerekecektir.
                              Her iki taraf onayladığında sipariş tamamlanmış sayılacaktır.
                            </p>
                          </div>
                          <Button 
                            onClick={() => {
                              handleUpdateOrderStatus(selectedOrder.id, 'delivered');
                              setShowOrderDialog(false);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Truck className="w-4 h-4 mr-2" />
                            Teslim Edildi (Catering Onayı Bekler)
                          </Button>
                        </div>
                      )}

                      {selectedOrder.status === 'delivered' && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center">
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                            <div>
                              <p className="font-medium text-green-800">Teslimat Tamamlandı!</p>
                              <p className="text-sm text-green-700">
                                {selectedOrder.delivered_at 
                                  ? `${new Date(selectedOrder.delivered_at).toLocaleString('tr-TR')} tarihinde teslim edildi`
                                  : 'Catering firması teslimatı onayladı'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedOrder.status === 'cancelled' && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded">
                          <div className="flex items-center">
                            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                            <div>
                              <p className="font-medium text-red-800">Sipariş İptal Edildi</p>
                              <p className="text-sm text-red-700">
                                Bu sipariş iptal edilmiştir ve işlem yapılamaz.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
                        <div className="space-y-1">
                          <p className="text-gray-900 font-medium">{order.catering_company_name}</p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(order.created_at).toLocaleString('tr-TR')}
                          </p>
                          {order.customer_phone && (
                            <p className="text-sm text-blue-600 flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {order.customer_phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-green-600">
                          ₺{order.total_amount?.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Durum: {getStatusLabel(order.status)}
                        </p>
                        {order.delivery_address && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center justify-end">
                            <MapPin className="w-3 h-3 mr-1" />
                            Adresli teslimat
                          </p>
                        )}
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
              <p className="text-gray-600">Detaylı satış performansını ve ürün bazında analizleri görüntüleyin</p>
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
            <>
              {/* Main Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <ShoppingCart className="w-8 h-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm text-gray-600">Toplam Satış</p>
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
                      <Calendar className="w-8 h-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-sm text-gray-600">Ortalama Günlük</p>
                        <p className="text-2xl font-semibold">
                          ₺{stats.total_revenue ? (stats.total_revenue / Math.max(1, 
                            statsPeriod === '1_day' ? 1 : 
                            statsPeriod === '1_week' ? 7 : 
                            statsPeriod === '1_month' ? 30 : 365)).toFixed(2) : '0.00'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Product Performance Analysis */}
              {products.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Ürün Bazında Satış Performansı
                    </CardTitle>
                    <CardDescription>
                      {statsPeriod === '1_day' ? 'Son 1 gün' :
                       statsPeriod === '1_week' ? 'Son 1 hafta' :
                       statsPeriod === '1_month' ? 'Son 1 ay' : 'Son 1 yıl'} içindeki ürün performansları
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left p-3 font-medium text-gray-900">Ürün Adı</th>
                            <th className="text-left p-3 font-medium text-gray-900">Kategori</th>
                            <th className="text-left p-3 font-medium text-900">Satış Adedi</th>
                            <th className="text-left p-3 font-medium text-gray-900">Toplam Gelir</th>
                            <th className="text-left p-3 font-medium text-gray-900">Ortalama Fiyat</th>
                            <th className="text-left p-3 font-medium text-gray-900">Performans</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((product) => {
                            // Mock satış verileri - gerçek implementasyonda order_items'dan gelecek
                            const mockSales = Math.floor(Math.random() * 50);
                            const mockRevenue = mockSales * product.unit_price;
                            const performance = mockSales > 20 ? 'Yüksek' : mockSales > 10 ? 'Orta' : 'Düşük';
                            
                            return (
                              <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="p-3">
                                  <div>
                                    <p className="font-medium text-gray-900">{product.name}</p>
                                    <p className="text-sm text-gray-500">{product.unit_type} başına</p>
                                  </div>
                                </td>
                                <td className="p-3 text-gray-600">{product.category || 'Kategori yok'}</td>
                                <td className="p-3 font-medium">{mockSales} {product.unit_type}</td>
                                <td className="p-3 font-medium text-green-600">₺{mockRevenue.toFixed(2)}</td>
                                <td className="p-3 text-gray-600">₺{product.unit_price.toFixed(2)}</td>
                                <td className="p-3">
                                  <Badge className={
                                    performance === 'Yüksek' ? 'bg-green-100 text-green-800' :
                                    performance === 'Orta' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }>
                                    {performance}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Analytics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Satış Trendi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Bu Dönem</span>
                        <span className="font-semibold">₺{stats.total_revenue?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Ortalama Sipariş Tutarı</span>
                        <span className="font-semibold">
                          ₺{stats.total_orders > 0 ? (stats.total_revenue / stats.total_orders).toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Aktif Ürün Sayısı</span>
                        <span className="font-semibold">{products.filter(p => p.is_active).length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      Önemli Uyarılar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {products.filter(p => p.stock_quantity === 0).length > 0 && (
                        <div className="flex items-center p-3 bg-red-50 rounded border border-red-200">
                          <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                          <span className="text-sm text-red-800">
                            {products.filter(p => p.stock_quantity === 0).length} ürün stokta yok
                          </span>
                        </div>
                      )}
                      {products.filter(p => p.stock_quantity < 10 && p.stock_quantity > 0).length > 0 && (
                        <div className="flex items-center p-3 bg-yellow-50 rounded border border-yellow-200">
                          <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                          <span className="text-sm text-yellow-800">
                            {products.filter(p => p.stock_quantity < 10 && p.stock_quantity > 0).length} ürün az stoklu
                          </span>
                        </div>
                      )}
                      {stats.pending_orders > 0 && (
                        <div className="flex items-center p-3 bg-blue-50 rounded border border-blue-200">
                          <Clock className="w-4 h-4 text-blue-600 mr-2" />
                          <span className="text-sm text-blue-800">
                            {stats.pending_orders} sipariş beklemede
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {!stats && (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">İstatistik Verisi Yükleniyor</h3>
                <p className="text-sm text-gray-500">
                  Lütfen bekleyiniz, verileriniz hazırlanıyor...
                </p>
              </CardContent>
            </Card>
          )}
          
          {!stats && (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">İstatistik Verisi Yükleniyor</h3>
                <p className="text-sm text-gray-500">
                  Lütfen bekleyiniz, verileriniz hazırlanıyor...
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StorefrontManagement;