import React, { useState, useEffect } from 'react';
import { useAuth } from '../ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  MessageSquare,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Send,
  Lightbulb,
  Users,
  TrendingUp,
  Tag
} from 'lucide-react';

/*
BACKEND ENTEGRASYON NOTLARI:

1. API Endpoints (Hazır):
   - GET /api/individual/{company_id}/{user_id}/requests?status=open/in_progress/resolved/closed
   - POST /api/individual/{company_id}/{user_id}/requests

2. Veri Yapısı:
   - Gönderilecek: {title, message, tags: ["yemek", "hijyen"], urgency: "low/med/high"}
   - Gelen: {requests: [{id, title, message, tags, urgency, status, created_at}], total}

3. İhtiyaçlar:
   - Durum güncellemeleri için admin paneli entegrasyonu
   - Tag sistemi ve kategori yönetimi
   - Upvote/downvote sistemi
   - Yanıt ve yorum sistemi
   - Push notifications (durum değişikliği)

4. UX İyileştirmeleri:
   - Gerçek zamanlı durum güncellemeleri
   - Fotoğraf ekleme
   - Benzer öneri önerileri
   - Voting sistemi
   - Community forum özelliği
*/

const RequestSuggestion = () => {
  const { companyId, userId } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    tags: [],
    urgency: 'med'
  });

  // Dummy veri - gerçekte API'den gelecek
  const requests = [
    {
      id: '1',
      title: 'Vejetaryen menü seçeneği eklenmesi',
      message: 'Merhaba, uzun zamandır şirketimizde çalışıyorum ve vejetaryen beslenme düzeni takip ediyorum. Menülerimizde daha fazla vejetaryen seçeneğin olması harika olurdu.',
      tags: ['yemek', 'vejetaryen', 'sağlık'],
      urgency: 'med',
      status: 'in_progress',
      created_at: '2025-01-18T10:30:00Z',
      updated_at: '2025-01-19T14:15:00Z',
      response: 'Öneriniz değerlendirilmek üzere catering firmasına iletildi.',
      votes: 12
    },
    {
      id: '2',
      title: 'Yemek servisi saatlerinin uzatılması',
      message: 'Vardiya sistemimizde çalışanlar için yemek servisi saatlerinin biraz daha esnek olması çok faydalı olacaktır. Özellikle geç kalan toplantılarda yemek kaçırıyoruz.',
      tags: ['servis', 'vardiya', 'saat'],
      urgency: 'high',
      status: 'open',
      created_at: '2025-01-17T16:45:00Z',
      votes: 8
    },
    {
      id: '3',
      title: 'Menü kalitesinin artırılması',
      message: 'Son dönemde menü kalitesinde düşüş gözlemleniyor. Özellikle sebzelerin tazeliği ve yemeklerin sıcaklığı konusunda iyileştirme yapılabilir.',
      tags: ['kalite', 'yemek', 'şikayet'],
      urgency: 'med',
      status: 'resolved',
      created_at: '2025-01-15T09:20:00Z',
      response: 'Kalite kontrol süreçlerimiz gözden geçirildi ve catering firmasıyla kalite standartları konuşuldu.',
      votes: 15
    },
    {
      id: '4',
      title: 'Allerjen bilgilerin menüde belirtilmesi',
      message: 'Gıda alerjim olduğu için menülerde allerjen bilgilerin açıkça belirtilmesi çok önemli. Bu konuda daha detaylı bilgilendirme yapılabilir.',
      tags: ['allerjen', 'sağlık', 'bilgilendirme'],
      urgency: 'high',
      status: 'closed',
      created_at: '2025-01-12T11:10:00Z',
      response: 'Allerjen bilgileri tüm menülere eklenmiştir. Dijital menü panellerinde detaylı allerjen listesi bulabilirsiniz.',
      votes: 6
    }
  ];

  const popularTags = [
    { name: 'yemek', count: 25 },
    { name: 'kalite', count: 18 },
    { name: 'servis', count: 12 },
    { name: 'sağlık', count: 10 },
    { name: 'hijyen', count: 8 },
    { name: 'fiyat', count: 6 },
    { name: 'çevre', count: 4 }
  ];

  const stats = {
    totalRequests: requests.length,
    openRequests: requests.filter(r => r.status === 'open').length,
    resolvedRequests: requests.filter(r => r.status === 'resolved').length,
    averageResponseTime: '2.5 gün'
  };

  const statusConfig = {
    open: { label: 'Açık', color: 'bg-blue-100 text-blue-700', icon: Clock },
    in_progress: { label: 'İnceleniyor', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
    resolved: { label: 'Çözüldü', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    closed: { label: 'Kapatıldı', color: 'bg-gray-100 text-gray-700', icon: XCircle }
  };

  const urgencyConfig = {
    low: { label: 'Düşük', color: 'bg-gray-100 text-gray-600' },
    med: { label: 'Orta', color: 'bg-orange-100 text-orange-600' },
    high: { label: 'Yüksek', color: 'bg-red-100 text-red-600' }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // API çağrısı burada yapılacak
    setIsDialogOpen(false);
    setFormData({ title: '', message: '', tags: [], urgency: 'med' });
  };

  const handleTagInput = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const newTag = e.target.value.trim().toLowerCase();
      if (!formData.tags.includes(newTag)) {
        setFormData({
          ...formData,
          tags: [...formData.tags, newTag]
        });
      }
      e.target.value = '';
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const filteredRequests = requests.filter(request => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesSearch = request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">İstek & Öneri</h1>
              <p className="text-gray-600">
                Fikirlerinizi paylaşın ve şirket yemekhane hizmetlerini birlikte iyileştirelim
              </p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni İstek/Öneri
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Yeni İstek/Öneri Gönder</DialogTitle>
                  <DialogDescription>
                    Yemekhane hizmetleri hakkında öneri veya isteklerinizi paylaşın
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Başlık</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Kısa ve açıklayıcı bir başlık yazın"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message">Mesaj</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Detaylı açıklama yazın..."
                      rows={4}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="urgency">Öncelik</Label>
                    <Select 
                      value={formData.urgency} 
                      onValueChange={(value) => setFormData({...formData, urgency: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Düşük</SelectItem>
                        <SelectItem value="med">Orta</SelectItem>
                        <SelectItem value="high">Yüksek</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="tags">Etiketler</Label>
                    <Input
                      id="tags"
                      placeholder="Etiket yazın ve Enter'a basın"
                      onKeyPress={handleTagInput}
                    />
                    {formData.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => removeTag(tag)}
                          >
                            {tag} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 pt-4">
                    <Button type="submit" className="flex-1">
                      <Send className="h-4 w-4 mr-2" />
                      Gönder
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      İptal
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Toplam İstek
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalRequests}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Açık İstekler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.openRequests}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Çözülen İstekler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.resolvedRequests}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Ortalama Yanıt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.averageResponseTime}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>İstek Listesi</span>
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Popüler Konular</span>
            </TabsTrigger>
          </TabsList>

          {/* İstek Listesi */}
          <TabsContent value="list">
            <div className="space-y-6">
              {/* Filtreler */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="İstek ve önerilerde ara..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Durumlar</SelectItem>
                        <SelectItem value="open">Açık</SelectItem>
                        <SelectItem value="in_progress">İnceleniyor</SelectItem>
                        <SelectItem value="resolved">Çözüldü</SelectItem>
                        <SelectItem value="closed">Kapatıldı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* İstekler */}
              <div className="space-y-4">
                {filteredRequests.map((request) => {
                  const statusInfo = statusConfig[request.status];
                  const StatusIcon = statusInfo.icon;
                  const urgencyInfo = urgencyConfig[request.urgency];
                  
                  return (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-lg text-gray-900">
                                {request.title}
                              </h3>
                              
                              <Badge className={`${statusInfo.color} border-0`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                              
                              <Badge variant="outline" className={urgencyInfo.color}>
                                {urgencyInfo.label}
                              </Badge>
                            </div>
                            
                            <p className="text-gray-700 mb-3 leading-relaxed">
                              {request.message}
                            </p>
                            
                            {/* Etiketler */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {request.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            
                            {/* Yanıt */}
                            {request.response && (
                              <Alert className="mt-3 border-green-200 bg-green-50">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-700">
                                  <strong>Yönetim Yanıtı:</strong> {request.response}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                          
                          <div className="ml-6 text-right">
                            <div className="text-sm text-gray-500 mb-2">
                              {formatDate(request.created_at)}
                            </div>
                            
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Users className="h-4 w-4" />
                              <span>{request.votes} destek</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {filteredRequests.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Henüz istek bulunamadı
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Filtrelere uygun istek/öneri bulunmuyor
                      </p>
                      <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        İlk İsteği Gönder
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Popüler Konular */}
          <TabsContent value="trending">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5 text-orange-500" />
                    <span>Popüler Etiketler</span>
                  </CardTitle>
                  <CardDescription>
                    En çok kullanılan konu etiketleri
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {popularTags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100"
                        onClick={() => setSearchQuery(tag.name)}
                      >
                        {tag.name} ({tag.count})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Önerilen Konular</CardTitle>
                  <CardDescription>
                    Bu konularda istek gönderebilirsiniz
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      'Menü çeşitliliğinin artırılması',
                      'Organik ürün kullanımı',
                      'Geri dönüştürülebilir ambalaj',
                      'Özel diyet menüleri',
                      'Servis saatleri düzenlemesi'
                    ].map((suggestion, index) => (
                      <div 
                        key={index}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setFormData({...formData, title: suggestion});
                          setIsDialogOpen(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">{suggestion}</span>
                          <Plus className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RequestSuggestion;