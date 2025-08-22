import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Home, 
  CheckSquare, 
  Star, 
  MessageSquare,
  Building2,
  Bell
} from 'lucide-react';

const IndividualHome = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Seç Ye</h1>
                <p className="text-sm text-gray-600">A-Tech Yazılım</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                Bireysel
              </Badge>
              <Button variant="outline" size="sm">
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Hoş Geldiniz!</h2>
          <p className="text-gray-600">Günlük menü seçimlerinizi yapın ve yemeklerinizi puanlayın.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Seçim Yap</CardTitle>
              <CheckSquare className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Bugün</div>
              <p className="text-xs text-muted-foreground">Menü seçimi yapın</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Puanla</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Puanlanmamış yemek</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">İstek/Öneri</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">Aktif öneri</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bildirimler</CardTitle>
              <Bell className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">Yeni bildirim</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Feed */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Son Aktiviteler
            </CardTitle>
            <CardDescription>Kişisel aktivite akışınız</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <Bell className="w-5 h-5 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-800">
                    Yeni menü yayınlandı!
                  </p>
                  <p className="text-xs text-orange-600">
                    LezzetSepeti bu hafta için yeni menüyü yayınladı. Seçim yapmak için tıklayın.
                  </p>
                  <Button size="sm" className="mt-2 bg-orange-500 hover:bg-orange-600">
                    Seçim Yap
                  </Button>
                </div>
                <div className="text-xs text-orange-500">2 saat önce</div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <Star className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Puanlama hatırlatması</p>
                  <p className="text-xs text-gray-600">
                    Dün yediğiniz "Izgara Tavuk & Bulgur" yemekini puanlamayı unutmayın.
                  </p>
                </div>
                <div className="text-xs text-gray-400">1 gün önce</div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <CheckSquare className="w-5 h-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Seçim tamamlandı</p>
                  <p className="text-xs text-gray-600">
                    Pazartesi öğle menüsü için "Sebzeli Mantı" seçtiniz.
                  </p>
                </div>
                <div className="text-xs text-gray-400">2 gün önce</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckSquare className="w-5 h-5 mr-2 text-orange-500" />
                Seçim Yap
              </CardTitle>
              <CardDescription>
                Günlük menü seçimlerinizi yapın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Bugün için mevcut menü seçeneklerini görüntüleyin ve tercih edin.
              </p>
              <Button className="w-full bg-orange-500 hover:bg-orange-600">
                Menüleri Gör
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                Puanla
              </CardTitle>
              <CardDescription>
                Yediğiniz yemekleri puanlayın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Son 7 günde yediğiniz yemeklere puan verin ve deneyiminizi paylaşın.
              </p>
              <Button variant="outline" className="w-full">
                Puanlamaya Git
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-500" />
                İstek/Öneri
              </CardTitle>
              <CardDescription>
                Görüş ve önerilerinizi paylaşın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Menü önerilerinizi paylaşın ve diğer çalışanların önerilerini görün.
              </p>
              <Button variant="outline" className="w-full">
                Önerileri Gör
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

const IndividualPanel = () => {
  return (
    <Routes>
      <Route path="/home" element={<IndividualHome />} />
      <Route path="/*" element={<IndividualHome />} />
    </Routes>
  );
};

export default IndividualPanel;