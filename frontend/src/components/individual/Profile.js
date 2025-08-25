import React, { useState, useEffect } from 'react';
import { useAuth } from '../ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  User,
  Shield,
  Phone,
  Mail,
  Building2,
  Key,
  Bell,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Settings,
  Download,
  Trash2,
  Clock
} from 'lucide-react';

/*
BACKEND ENTEGRASYON NOTLARI:

1. API Endpoints (Hazır):
   - PUT /api/individual/{company_id}/{user_id}/profile

2. Veri Yapısı:
   - Şifre değiştirme: {current_password, new_password}
   - Profil güncelleme: {phone} (şimdilik read-only)

3. İhtiyaçlar:
   - Telefon numarası güncelleme sistemi (onay süreci)
   - Email ekleme/güncelleme
   - Profil fotoğrafı upload
   - 2FA (İki faktörlü doğrulama)
   - Login history ve güvenlik logları
   - GDPR data export/delete

4. UX İyileştirmeleri:
   - Şifre güçlülük kontrolü
   - Gerçek zamanlı doğrulama
   - Güvenlik önerилeri
   - Session yönetimi
   - Bildirim tercihleri
*/

const Profile = () => {
  const { companyId, userId } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [profileForm, setProfileForm] = useState({
    fullName: 'Ahmet Yılmaz',
    phone: '+905551234567',
    email: 'ahmet.yilmaz@atech.com.tr'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    mealReminders: true,
    menuUpdates: true,
    systemUpdates: false,
    requestUpdates: true
  });

  // Dummy user data - gerçekte API'den gelecek
  const userInfo = {
    fullName: 'Ahmet Yılmaz',
    phone: '+905551234567',
    email: 'ahmet.yilmaz@atech.com.tr',
    company: 'A-Tech Yazılım',
    joinDate: '2024-03-15',
    lastLogin: '2025-01-20T14:30:00Z',
    loginCount: 156,
    mealCount: 89,
    averageRating: 4.2
  };

  const securityLogs = [
    {
      id: '1',
      action: 'Giriş yapıldı',
      device: 'Chrome - Windows',
      location: 'İstanbul, TR',
      timestamp: '2025-01-20T14:30:00Z',
      success: true
    },
    {
      id: '2',
      action: 'Şifre değiştirildi',
      device: 'Chrome - Windows',
      location: 'İstanbul, TR', 
      timestamp: '2025-01-18T09:15:00Z',
      success: true
    },
    {
      id: '3',
      action: 'Başarısız giriş denemesi',
      device: 'Safari - iPhone',
      location: 'İstanbul, TR',
      timestamp: '2025-01-17T22:45:00Z',
      success: false
    }
  ];

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Yeni şifreler eşleşmiyor');
      return;
    }

    setLoading(true);
    
    try {
      // API çağrısı burada yapılacak
      console.log('Password change:', {
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword
      });
      
      // Başarı durumu
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      alert('Şifre başarıyla değiştirildi');
    } catch (error) {
      alert('Şifre değiştirme başarısız: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = (key, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }));
    // API çağrısı burada yapılacak
    console.log('Notification settings updated:', { [key]: value });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPasswordStrength = (password) => {
    if (password.length < 6) return { level: 0, text: 'Çok zayıf', color: 'bg-red-500' };
    if (password.length < 8) return { level: 1, text: 'Zayıf', color: 'bg-orange-500' };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return { level: 2, text: 'Orta', color: 'bg-yellow-500' };
    if (!/(?=.*[!@#$%^&*])/.test(password)) return { level: 3, text: 'İyi', color: 'bg-blue-500' };
    return { level: 4, text: 'Güçlü', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hesabım</h1>
          <p className="text-gray-600">
            Hesap bilgilerinizi yönetin ve güvenlik ayarlarınızı düzenleyin
          </p>
        </div>

        {/* Profile Summary Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <User className="h-10 w-10 text-white" />
              </div>
              
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {userInfo.fullName}
                </h2>
                <div className="space-y-1">
                  <div className="flex items-center text-gray-600">
                    <Building2 className="h-4 w-4 mr-2" />
                    <span>{userInfo.company}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{userInfo.phone}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>{userInfo.email}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right space-y-2">
                <Badge className="bg-green-100 text-green-700">Aktif</Badge>
                <div className="text-sm text-gray-500">
                  Üyelik: {formatDate(userInfo.joinDate)}
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-6 grid grid-cols-3 gap-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{userInfo.loginCount}</div>
                <div className="text-sm text-gray-500">Toplam Giriş</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{userInfo.mealCount}</div>
                <div className="text-sm text-gray-500">Yemek Siparişi</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{userInfo.averageRating}</div>
                <div className="text-sm text-gray-500">Ortalama Puan</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Profil Bilgileri</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Güvenlik</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Ayarlar</span>
            </TabsTrigger>
          </TabsList>

          {/* Profil Bilgileri */}
          <TabsContent value="profile">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Kişisel Bilgiler</CardTitle>
                  <CardDescription>
                    Temel profil bilgilerinizi görüntüleyin ve düzenleyin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Ad Soyad</Label>
                      <Input
                        id="fullName"
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm({...profileForm, fullName: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        value={profileForm.phone}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Telefon numarası değişikliği şu anda desteklenmiyor
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">E-posta</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        E-posta adresi otomatik oluşturulmuştur
                      </p>
                    </div>
                    
                    <div>
                      <Label>Şirket</Label>
                      <Input
                        value={userInfo.company}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button disabled>
                      <Check className="h-4 w-4 mr-2" />
                      Değişiklikleri Kaydet
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      * Profil güncellemeleri yakında aktif edilecektir
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Güvenlik */}
          <TabsContent value="security">
            <div className="space-y-6">
              {/* Şifre Değiştirme */}
              <Card>
                <CardHeader>
                  <CardTitle>Şifre Değiştir</CardTitle>
                  <CardDescription>
                    Hesabınızın güvenliği için düzenli olarak şifrenizi değiştirin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="newPassword">Yeni Şifre</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      
                      {passwordForm.newPassword && (
                        <div className="mt-2">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                style={{ width: `${(passwordStrength.level + 1) * 20}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{passwordStrength.text}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            En az 8 karakter, büyük/küçük harf, rakam ve özel karakter kullanın
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      
                      {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                        <p className="text-sm text-red-600 mt-1">
                          Şifreler eşleşmiyor
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                    >
                      {loading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Güvenlik Geçmişi */}
              <Card>
                <CardHeader>
                  <CardTitle>Son Güvenlik Aktiviteleri</CardTitle>
                  <CardDescription>
                    Hesabınızdaki son güvenlik olayları
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {securityLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="font-medium text-gray-900">{log.action}</p>
                            <p className="text-sm text-gray-500">
                              {log.device} • {log.location}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {formatDate(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ayarlar */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Bildirim Tercihleri */}
              <Card>
                <CardHeader>
                  <CardTitle>Bildirim Tercihleri</CardTitle>
                  <CardDescription>
                    Hangi bildirimler alacağınızı seçin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'mealReminders', label: 'Yemek Seçimi Hatırlatmaları', desc: 'Günlük menü seçim zamanı yaklaşınca bildirim al' },
                    { key: 'menuUpdates', label: 'Menü Güncellemeleri', desc: 'Yeni menüler ve değişiklikler hakkında bilgilendir' },
                    { key: 'systemUpdates', label: 'Sistem Güncellemeleri', desc: 'Sistem bakımları ve yeni özellikler' },
                    { key: 'requestUpdates', label: 'İstek/Öneri Güncellemeleri', desc: 'Gönderdiğiniz isteklerin durumu hakkında bildirim' }
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{setting.label}</h4>
                        <p className="text-sm text-gray-500">{setting.desc}</p>
                      </div>
                      <button
                        onClick={() => handleNotificationUpdate(setting.key, !notificationSettings[setting.key])}
                        className={`
                          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                          ${notificationSettings[setting.key] ? 'bg-orange-500' : 'bg-gray-300'}
                        `}
                      >
                        <span
                          className={`
                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                            ${notificationSettings[setting.key] ? 'translate-x-6' : 'translate-x-1'}
                          `}
                        />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Veri ve Gizlilik */}
              <Card>
                <CardHeader>
                  <CardTitle>Veri ve Gizlilik</CardTitle>
                  <CardDescription>
                    Kişisel verilerinizi yönetin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Verilerimi İndir
                    </Button>
                    
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Kişisel verileriniz KVKK kapsamında korunmaktadır. 
                        Veri silme talebi için İK departmanına başvurun.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>

              {/* Hesap Bilgileri */}
              <Card>
                <CardHeader>
                  <CardTitle>Hesap Bilgileri</CardTitle>
                  <CardDescription>
                    Hesabınızla ilgili teknik detaylar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Hesap ID:</span>
                      <div className="text-gray-600 font-mono">{userId}</div>
                    </div>
                    <div>
                      <span className="font-medium">Şirket ID:</span>
                      <div className="text-gray-600 font-mono">{companyId}</div>
                    </div>
                    <div>
                      <span className="font-medium">Son Giriş:</span>
                      <div className="text-gray-600">{formatDate(userInfo.lastLogin)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Hesap Durumu:</span>
                      <Badge className="ml-2 bg-green-100 text-green-700">Aktif</Badge>
                    </div>
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

export default Profile;