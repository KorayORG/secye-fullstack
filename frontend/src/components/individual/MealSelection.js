import React, { useState, useEffect } from 'react';
import { useAuth } from '../ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Calendar,
  Clock,
  ChefHat,
  Utensils,
  ArrowLeft,
  ArrowRight,
  Check,
  Star,
  Users,
  Info
} from 'lucide-react';

/*
BACKEND ENTEGRASYON NOTLARI:

1. API Endpoints (Hazır):
   - GET /api/individual/{company_id}/{user_id}/meal-choices?from_date=2025-01-20&to_date=2025-01-27
   - POST /api/individual/{company_id}/{user_id}/meal-choices
   
2. Veri Yapısı:
   - Gönderilecek: {date: "2025-01-20", choice: "ALTERNATIF"/"GELENEKSEL", catering_id: "..."}
   - Gelen: {meal_choices: [...], total: number}

3. İhtiyaçlar:
   - Vardiya seçimi için shifts API'si
   - Catering firmaları listesi 
   - Günlük menü görüntüleme API'si
   - Seçim deadline kontrolü

4. UX İyileştirmeleri:
   - Real-time seçim kaydetme
   - Drag & drop menü kartları
   - Bulk selection (haftalık seçim)
   - Push notification reminder
*/

const MealSelection = () => {
  const { companyId, userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState('shift-1');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selections, setSelections] = useState({});

  // API'den gelecek veriler
  const [shifts, setShifts] = useState([]);
  const [menuOptions, setMenuOptions] = useState({});
  const [loading, setLoading] = useState(false);
  // API'den vardiya ve menü verilerini çek
  useEffect(() => {
    const fetchShiftsAndMenus = async () => {
      setLoading(true);
      try {
        // Vardiya listesi
        const shiftRes = await fetch(`/api/individual/${companyId}/${userId}/shifts`);
        const shiftData = await shiftRes.json();
        setShifts(shiftData.shifts || []);

        // Menü seçenekleri (haftalık menü)
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekEndStr = weekEnd.toISOString().split('T')[0];
        const menuRes = await fetch(`/api/individual/${companyId}/${userId}/menus?from_date=${weekStartStr}&to_date=${weekEndStr}`);
        const menuData = await menuRes.json();
        // menuData ör: { menus: { '2025-01-20': { GELENEKSEL: {...}, ALTERNATIF: {...} }, ... } }
        // Burada örnek olarak haftanın ilk günü menüsünü alıyoruz
        if (menuData.menus && Object.keys(menuData.menus).length > 0) {
          // Haftanın ilk günü menüsünü göster
          setMenuOptions(menuData.menus[Object.keys(menuData.menus)[0]]);
        }
      } catch (e) {
        setShifts([]);
        setMenuOptions({});
      } finally {
        setLoading(false);
      }
    };
    fetchShiftsAndMenus();
    // eslint-disable-next-line
  }, [companyId, userId, currentWeek]);

  // Haftalık tarih hesaplama
  const getWeekDates = (weekOffset = 0) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7)); // Pazartesi başlangıç
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentWeek);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const formatDate = (date) => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short'
    });
  };

  const isWeekend = (date) => {
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Seçim yapınca state'e ekle
  const handleMealChoice = (date, choice) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelections(prev => ({
      ...prev,
      [dateStr]: choice
    }));
  };

  // Seçimleri kaydet API
  const handleSaveSelections = async () => {
    setLoading(true);
    try {
      const payload = Object.entries(selections).map(([date, choice]) => ({
        date,
        choice,
        shift_id: selectedShift
      }));
      await fetch(`/api/individual/${companyId}/${userId}/meal-choices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choices: payload })
      });
      alert('Seçimleriniz kaydedildi!');
    } catch (e) {
      alert('Seçimler kaydedilemedi!');
    } finally {
      setLoading(false);
    }
  };

  const getSelectionForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return selections[dateStr];
  };

  const renderMealCard = (date, menuType, menuData) => {
    const isSelected = getSelectionForDate(date) === menuType;
    const isPast = isPastDate(date);
    const isWeekendDay = isWeekend(date);

    return (
      <div
        key={`${date}-${menuType}`}
        className={`
          relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-300
          ${isSelected 
            ? 'border-orange-500 bg-orange-50 shadow-lg transform scale-105' 
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
          }
          ${isPast || isWeekendDay 
            ? 'opacity-50 cursor-not-allowed' 
            : ''
          }
        `}
        onClick={() => {
          if (!isPast && !isWeekendDay) {
            handleMealChoice(date, menuType);
          }
        }}
      >
        {/* Seçim İşareti */}
        {isSelected && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
            <Check className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Menü İçeriği */}
        <div className="text-center">
          <div className="text-3xl mb-2">{menuData.image}</div>
          <h3 className="font-semibold text-lg mb-2">{menuData.name}</h3>
          <p className="text-sm text-gray-600 mb-3">{menuData.description}</p>
          
          {/* Menü Detayları */}
          <div className="space-y-2">
            {menuData.items.map((item, index) => (
              <div key={index} className="text-xs text-gray-500 flex items-center justify-center">
                <span className="w-1 h-1 bg-gray-400 rounded-full mr-1"></span>
                {item}
              </div>
            ))}
          </div>

          {/* Popülarlik */}
          <div className="mt-3 flex items-center justify-center space-x-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500">
              %{menuData.popularity} tercih
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {loading && <div className="text-center text-orange-600 font-bold">Yükleniyor...</div>}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Seçim Yap</h1>
          <p className="text-gray-600">
            Haftalık menü seçiminizi yapın. Her gün için bir seçenek belirleyin.
          </p>
        </div>

        {/* Bilgi Uyarısı */}
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <Info className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700">
            Menü seçimleri her gün saat 16:00'a kadar yapılabilir. Hafta sonu için seçim yapılamaz.
          </AlertDescription>
        </Alert>

        {/* Vardiya Seçimi */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span>Vardiya Seçimi</span>
            </CardTitle>
            <CardDescription>
              Çalıştığınız vardiyayı seçin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {shifts.map((shift) => (
                <Button
                  key={shift.id}
                  variant={selectedShift === shift.id ? "default" : "outline"}
                  className="h-16 flex flex-col justify-center"
                  onClick={() => setSelectedShift(shift.id)}
                >
                  <span className="font-semibold">{shift.name}</span>
                  <span className="text-xs opacity-75">{shift.users} kişi</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hafta Navigasyonu */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                <CardTitle>
                  {formatDate(weekStart)} - {formatDate(weekEnd)}
                </CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(currentWeek - 1)}
                  disabled={currentWeek <= 0}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Önceki Hafta
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(currentWeek + 1)}
                  disabled={currentWeek >= 4}
                >
                  Sonraki Hafta
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Günlük Menü Seçimleri */}
        <div className="space-y-8">
          {weekDates.map((date) => {
            const isWeekendDay = isWeekend(date);
            const isPast = isPastDate(date);
            const dayName = date.toLocaleDateString('tr-TR', { weekday: 'long' });

            if (isWeekendDay) {
              return (
                <Card key={date.toISOString()}>
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-400">
                      <Calendar className="h-12 w-12 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2 capitalize">{dayName}</h3>
                      <p className="text-gray-500">
                        {formatDate(date)} - Hafta sonu, menü servisi yok
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            // Her gün için menü API'den geliyorsa, o günün menüsünü kullan
            // Eğer yoksa, haftanın ilk günü menüsünü göster (örnek amaçlı)
            let dayMenuOptions = menuOptions;
            if (typeof menuOptions === 'object' && menuOptions !== null && menuOptions[date.toISOString().split('T')[0]]) {
              dayMenuOptions = menuOptions[date.toISOString().split('T')[0]];
            }

            return (
              <Card key={date.toISOString()}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="capitalize flex items-center space-x-2">
                        <ChefHat className="h-5 w-5 text-orange-500" />
                        <span>{dayName}, {formatDate(date)}</span>
                        {isPast && <Badge variant="secondary">Geçmiş</Badge>}
                        {getSelectionForDate(date) && dayMenuOptions[getSelectionForDate(date)] && (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Seçildi: {dayMenuOptions[getSelectionForDate(date)].name}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {isPast 
                          ? 'Bu tarih için seçim süresi geçmiş' 
                          : 'Tercih ettiğiniz menüyü seçin'
                        }
                      </CardDescription>
                    </div>
                    
                    {!isPast && (
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Son seçim:</div>
                        <div className="font-semibold text-orange-600">16:00</div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {dayMenuOptions && Object.entries(dayMenuOptions).map(([menuType, menuData]) => 
                      renderMealCard(date, menuType, menuData)
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Kaydet Butonu */}
        <div className="mt-8 text-center">
          <Button 
            size="lg"
            className="px-12 py-3 text-lg"
            disabled={Object.keys(selections).length === 0 || loading}
            onClick={handleSaveSelections}
          >
            <Check className="h-5 w-5 mr-2" />
            Seçimleri Kaydet ({Object.keys(selections).length} gün)
          </Button>
        </div>

        {/* İstatistikler */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span>Bu Hafta İstatistikler</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Object.keys(selections).length}/5
                </div>
                <div className="text-sm text-gray-600">Gün seçildi</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Object.values(selections).filter(s => s === 'GELENEKSEL').length}
                </div>
                <div className="text-sm text-gray-600">Geleneksel menü</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.values(selections).filter(s => s === 'ALTERNATIF').length}
                </div>
                <div className="text-sm text-gray-600">Alternatif menü</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MealSelection;