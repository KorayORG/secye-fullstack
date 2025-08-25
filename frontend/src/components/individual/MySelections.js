import React, { useState, useEffect } from 'react';
import { useAuth } from '../ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Calendar,
  Star,
  TrendingUp,
  Clock,
  ChefHat,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Filter,
  Download,
  BarChart3
} from 'lucide-react';

/*
BACKEND ENTEGRASYON NOTLARI:

1. API Endpoints (Hazır):
   - GET /api/individual/{company_id}/{user_id}/meal-choices?from_date=2025-01-01&to_date=2025-01-31
   - PATCH /api/individual/{company_id}/{user_id}/meal-choices/{choice_id}/stars

2. Veri Yapısı:
   - Gelen: {meal_choices: [{id, date, choice, stars, catering_id, created_at}], total}
   - Güncelleme: {stars: 1-5}

3. İhtiyaçlar:
   - Filtering: tarih aralığı, menü tipi, puanlı/puansız
   - Sorting: tarihe göre, puana göre
   - Export: PDF/Excel çıktısı
   - Analytics: aylık/haftalık istatistikler

4. UX İyileştirmeleri:
   - Infinite scroll veya pagination
   - Bulk rating (çoklu puanlama)
   - Foto ekleme ve yorum sistemi
   - Push notification (puanlama hatırlatması)
*/

const MySelections = () => {
  const { companyId, userId } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('all');
  
  // Dummy veri - gerçekte API'den gelecek
  const mealHistory = [
    {
      id: '1',
      date: '2025-01-20',
      choice: 'GELENEKSEL',
      menu: 'Mercimek Çorbası, Etli Kuru Fasulye, Pilav',
      catering: 'Lezzet Catering',
      stars: 4,
      consumed: true,
      day: 'Pazartesi'
    },
    {
      id: '2', 
      date: '2025-01-19',
      choice: 'ALTERNATIF',
      menu: 'Brokoli Çorbası, Izgara Tavuk, Kinoa Salatası',
      catering: 'Healthy Bites',
      stars: 5,
      consumed: true,
      day: 'Pazar'
    },
    {
      id: '3',
      date: '2025-01-18',
      choice: 'GELENEKSEL', 
      menu: 'Domates Çorbası, Köfte, Bulgur Pilavı',
      catering: 'Lezzet Catering',
      stars: null,
      consumed: true,
      day: 'Cumartesi'
    },
    {
      id: '4',
      date: '2025-01-17',
      choice: 'ALTERNATIF',
      menu: 'Sebze Çorbası, Somon, Avokado Salatası', 
      catering: 'Healthy Bites',
      stars: 3,
      consumed: false,
      day: 'Cuma'
    },
    {
      id: '5',
      date: '2025-01-16',
      choice: 'GELENEKSEL',
      menu: 'Yayla Çorbası, Tavuk Şiş, Pirinç Pilavı',
      catering: 'Lezzet Catering', 
      stars: 4,
      consumed: true,
      day: 'Perşembe'
    }
  ];

  const monthlyStats = {
    totalMeals: 23,
    ratedMeals: 19,
    averageRating: 4.2,
    favoriteChoice: 'GELENEKSEL',
    favoriteChoicePercentage: 65,
    topCatering: 'Lezzet Catering'
  };

  const ratingDistribution = [
    { stars: 5, count: 8, percentage: 42 },
    { stars: 4, count: 6, percentage: 32 },
    { stars: 3, count: 3, percentage: 16 },
    { stars: 2, count: 2, percentage: 10 },
    { stars: 1, count: 0, percentage: 0 }
  ];

  const handleRating = (mealId, stars) => {
    console.log(`Rating meal ${mealId} with ${stars} stars`);
    // API çağrısı burada yapılacak
  };

  const renderStarRating = (currentRating, mealId, editable = true) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => editable && handleRating(mealId, star)}
            disabled={!editable}
            className={`
              ${editable ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}
              transition-transform duration-150
            `}
          >
            <Star
              className={`h-5 w-5 ${
                currentRating && star <= currentRating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-300'
              }`}
            />
          </button>
        ))}
        {editable && !currentRating && (
          <span className="text-xs text-gray-500 ml-2">Puanla</span>
        )}
      </div>
    );
  };

  const filteredMeals = mealHistory.filter(meal => {
    if (filterType === 'all') return true;
    if (filterType === 'rated') return meal.stars !== null;
    if (filterType === 'unrated') return meal.stars === null;
    if (filterType === 'geleneksel') return meal.choice === 'GELENEKSEL';
    if (filterType === 'alternatif') return meal.choice === 'ALTERNATIF';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Seçtiklerim</h1>
          <p className="text-gray-600">
            Geçmiş menü seçimlerinizi görüntüleyin ve değerlendirin
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Yemek Listesi</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>İstatistikler</span>
            </TabsTrigger>
          </TabsList>

          {/* Liste Görünümü */}
          <TabsContent value="list">
            <div className="space-y-6">
              {/* Filtreler */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Filter className="h-5 w-5 text-orange-500" />
                    <span>Filtreler</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Durum:</span>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                      >
                        <option value="all">Tümü</option>
                        <option value="rated">Puanlanmış</option>
                        <option value="unrated">Puanlanmamış</option>
                        <option value="geleneksel">Geleneksel</option>
                        <option value="alternatif">Alternatif</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Ay:</span>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            {new Date(2025, i).toLocaleDateString('tr-TR', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Excel İndir
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Puanlanmamış Uyarı */}
              {filteredMeals.some(meal => meal.stars === null) && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700">
                    {filteredMeals.filter(meal => meal.stars === null).length} adet puanlanmamış yemeğiniz var. 
                    Değerlendirmeniz bizim için çok değerli!
                  </AlertDescription>
                </Alert>
              )}

              {/* Yemek Listesi */}
              <div className="space-y-4">
                {filteredMeals.map((meal) => (
                  <Card key={meal.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-3">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">
                                {meal.day}, {new Date(meal.date).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                            
                            <Badge 
                              variant={meal.choice === 'GELENEKSEL' ? 'default' : 'secondary'}
                              className={meal.choice === 'GELENEKSEL' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}
                            >
                              {meal.choice === 'GELENEKSEL' ? 'Geleneksel' : 'Alternatif'}
                            </Badge>

                            <Badge variant="outline" className="text-xs">
                              {meal.catering}
                            </Badge>

                            {!meal.consumed && (
                              <Badge variant="secondary" className="bg-red-100 text-red-700">
                                Tüketilmedi
                              </Badge>
                            )}
                          </div>

                          <div className="mb-3">
                            <h3 className="font-semibold text-lg mb-1">Menü İçeriği</h3>
                            <p className="text-gray-600">{meal.menu}</p>
                          </div>

                          {/* Puanlama */}
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-gray-700 mr-3">
                                Değerlendirmeniz:
                              </span>
                              {renderStarRating(meal.stars, meal.id, meal.consumed)}
                            </div>

                            {meal.stars && (
                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <ThumbsUp className="h-4 w-4" />
                                <span>Teşekkürler!</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                            <ChefHat className="h-8 w-8 text-orange-600" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* İstatistikler Görünümü */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              {/* Genel İstatistikler */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Toplam Yemek
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">
                      {monthlyStats.totalMeals}
                    </div>
                    <p className="text-sm text-gray-500">Bu ay</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Ortalama Puan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold text-yellow-600">
                        {monthlyStats.averageRating}
                      </div>
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    </div>
                    <p className="text-sm text-gray-500">5 üzerinden</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Favori Menü
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-orange-600 mb-1">
                      Geleneksel
                    </div>
                    <p className="text-sm text-gray-500">
                      %{monthlyStats.favoriteChoicePercentage} tercih
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Değerlendirme
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {monthlyStats.ratedMeals}/{monthlyStats.totalMeals}
                    </div>
                    <p className="text-sm text-gray-500">Puanlandı</p>
                  </CardContent>
                </Card>
              </div>

              {/* Puan Dağılımı */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-orange-500" />
                    <span>Puan Dağılımı</span>
                  </CardTitle>
                  <CardDescription>
                    Verdiğiniz puanların dağılımı
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ratingDistribution.map((item) => (
                      <div key={item.stars} className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1 w-20">
                          <span className="text-sm font-medium">{item.stars}</span>
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        </div>
                        
                        <div className="flex-1 bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        
                        <div className="text-sm text-gray-600 w-16">
                          {item.count} adet
                        </div>
                        
                        <div className="text-sm text-gray-500 w-12">
                          %{item.percentage}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Aylık Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span>Aylık Trend</span>
                  </CardTitle>
                  <CardDescription>
                    Son 6 ayın yemek tüketim grafiği
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-48 flex items-end justify-between space-x-2">
                    {['Ağu', 'Eyl', 'Eki', 'Kas', 'Ara', 'Oca'].map((month, index) => {
                      const height = Math.random() * 80 + 20; // Dummy veri
                      return (
                        <div key={month} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-gradient-to-t from-orange-500 to-orange-300 rounded-t-md transition-all duration-1000 delay-100"
                            style={{ height: `${height}%` }}
                          />
                          <div className="text-xs text-gray-600 mt-2">{month}</div>
                        </div>
                      );
                    })}
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

export default MySelections;