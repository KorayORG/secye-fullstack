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
  // Sadece yemek listesi sekmesi kalacak
  const [activeTab, setActiveTab] = useState('list');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('all');
  
  const [mealHistory, setMealHistory] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const handleRating = async (mealId, stars) => {
    try {
      setLoading(true);
      await fetch(`/api/individual/${companyId}/${userId}/meal-choices/${mealId}/stars`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars })
      });
      // Güncel veriyi tekrar çek
      fetchMealHistory();
    } catch (e) {
      alert('Puan kaydedilemedi!');
    } finally {
      setLoading(false);
    }
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
  // API'den meal history çek
  const fetchMealHistory = async () => {
    setLoading(true);
    try {
      // Tarih aralığı filtreleri
      const fromDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
      const toDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
      const res = await fetch(`/api/individual/${companyId}/${userId}/meal-choices?from_date=${fromDate}&to_date=${toDate}`);
      const data = await res.json();
      // API: { meal_choices: [...] }
      setMealHistory(data.meal_choices || []);
    } catch (e) {
      setMealHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealHistory();
    // eslint-disable-next-line
  }, [selectedMonth, selectedYear]);
    if (filterType === 'all') return true;
    if (filterType === 'rated') return meal.stars !== null;
    if (filterType === 'unrated') return meal.stars === null;
    if (filterType === 'geleneksel') return meal.choice === 'GELENEKSEL';
    if (filterType === 'alternatif') return meal.choice === 'ALTERNATIF';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {loading && <div className="text-center text-orange-600 font-bold">Yükleniyor...</div>}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Seçtiklerim</h1>
          <p className="text-gray-600">
            Geçmiş menü seçimlerinizi görüntüleyin ve değerlendirin
          </p>
        </div>

        {/* Sadece yemek listesi sekmesi */}
        <div className="mb-6">
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
          <div className="space-y-4 mt-6">
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
      </div>
    </div>
  );
};

export default MySelections;