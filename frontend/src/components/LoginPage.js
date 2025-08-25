import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Building2, User, Phone, Lock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LoginPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('individual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login states
  const [loginData, setLoginData] = useState({
    phone: '',
    password: '',
    companyType: '',
    companyId: ''
  });

  // Register states
  const [registerData, setRegisterData] = useState({
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyType: '',
    companyId: ''
  });

  // Company search
  const [companies, setCompanies] = useState([]);
  const [companySearch, setCompanySearch] = useState('');
  const [searchingCompanies, setSearchingCompanies] = useState(false);

  // Search companies with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (companySearch && (loginData.companyType || registerData.companyType)) {
        searchCompanies();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [companySearch, loginData.companyType, registerData.companyType]);

  const searchCompanies = async () => {
    setSearchingCompanies(true);
    try {
      const companyType = loginData.companyType || registerData.companyType;
      const response = await axios.get(`${API}/companies/search`, {
        params: {
          type: companyType,
          query: companySearch,
          limit: 10
        }
      });
      setCompanies(response.data.companies);
    } catch (err) {
      console.error('Company search error:', err);
    } finally {
      setSearchingCompanies(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/auth/login`, {
        phone: loginData.phone,
        password: loginData.password,
        company_type: loginData.companyType,
        company_id: loginData.companyId
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        // Navigate to the redirect URL
        if (response.data.redirect_url) {
          navigate(response.data.redirect_url);
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Giriş işlemi başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API}/auth/register/individual`, {
        full_name: registerData.fullName,
        phone: registerData.phone,
        password: registerData.password,
        company_type: registerData.companyType,
        company_id: registerData.companyId
      });

      if (response.data.success) {
        setSuccess('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
        setActiveTab('individual');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Kayıt işlemi başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleCorporateApplication = async () => {
    setLoading(true);
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      setLoading(false);
      return;
    }

    try {
      const applicationData = {
        mode: registerData.applicationMode,
        applicant: {
          full_name: registerData.fullName,
          phone: registerData.phone,
          email: registerData.email
        },
        password: registerData.password
      };

      if (registerData.applicationMode === 'existing') {
        applicationData.target = {
          mode: 'existing',
          company_id: registerData.companyId
        };
      } else {
        applicationData.target = {
          mode: 'new',
          company_type: registerData.companyType,
          new_company_payload: {
            name: registerData.newCompanyName,
            address: registerData.newCompanyAddress,
            contact_phone: registerData.newCompanyPhone,
            owner_full_name: registerData.fullName,
            owner_phone: registerData.phone,
            owner_email: registerData.email
          }
        };
      }

      const response = await axios.post(`${API}/auth/register/corporate/application`, applicationData);

      if (response.data.success) {
        setSuccess('Kurumsal hesap başvurunuz alındı! Değerlendirme sonrası size bilgi verilecektir.');
        setActiveTab('corporate');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Başvuru işlemi başarısız');
    } finally {
      setLoading(false);
    }
  };

  const isApplicationFormValid = () => {
    if (!registerData.applicationMode || !registerData.fullName || !registerData.phone || 
        !registerData.email || !registerData.password || !registerData.confirmPassword) {
      return false;
    }

    if (registerData.applicationMode === 'existing') {
      return registerData.companyType && registerData.companyId;
    } else {
      return registerData.companyType && registerData.newCompanyName && 
             registerData.newCompanyAddress && registerData.newCompanyPhone;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Seç Ye</h1>
          <p className="text-gray-600 mt-2">Yemek seçimi artık daha kolay</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Hoş Geldiniz</CardTitle>
            <CardDescription className="text-center">
              Hesabınıza giriş yapın veya yeni hesap oluşturun
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="individual">
                  <User className="w-4 h-4 mr-2" />
                  Bireysel
                </TabsTrigger>
                <TabsTrigger value="corporate">
                  <Building2 className="w-4 h-4 mr-2" />
                  Kurumsal
                </TabsTrigger>
              </TabsList>

              {/* Individual Tab - Login */}
              <TabsContent value="individual" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyType">Şirket Tipi</Label>
                    <Select 
                      value={loginData.companyType} 
                      onValueChange={(value) => setLoginData(prev => ({...prev, companyType: value, companyId: ''}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Şirket tipini seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corporate">Firma</SelectItem>
                        <SelectItem value="catering">Catering</SelectItem>
                        <SelectItem value="supplier">Tedarikçi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {loginData.companyType && (
                    <div className="space-y-2">
                      <Label htmlFor="company">Şirket</Label>
                      <div className="relative">
                        <Input
                          placeholder="Şirket adı yazın..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          className="pr-8"
                        />
                        {searchingCompanies && (
                          <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 transform -translate-y-1/2" />
                        )}
                      </div>
                      {companies.length > 0 && (
                        <div className="border rounded-md max-h-40 overflow-y-auto">
                          {companies.map((company) => (
                            <div
                              key={company.id}
                              className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                console.log('Company selected:', company); // Debug log
                                setLoginData(prev => {
                                  const updated = {...prev, companyId: company.id};
                                  console.log('Updated loginData:', updated); // Debug log
                                  return updated;
                                });
                                setCompanySearch(company.name);
                                setCompanies([]);
                              }}
                            >
                              <div className="font-medium">{company.name}</div>
                              <div className="text-sm text-gray-500">{company.slug}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+90 555 123 4567"
                        value={loginData.phone}
                        onChange={(e) => setLoginData(prev => ({...prev, phone: e.target.value}))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Şifre</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({...prev, password: e.target.value}))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={loading || !loginData.companyId}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Giriş Yap
                  </Button>
                </form>

                <Separator />

                <div className="text-center">
                  <Button 
                    variant="link" 
                    onClick={() => setActiveTab('register')}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    Hesabınız yok mu? Kayıt olun
                  </Button>
                </div>
              </TabsContent>

              {/* Corporate Tab - Login */}
              <TabsContent value="corporate" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="corpCompanyType">Şirket Tipi</Label>
                    <Select 
                      value={loginData.companyType} 
                      onValueChange={(value) => setLoginData(prev => ({...prev, companyType: value, companyId: ''}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Şirket tipini seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corporate">Firma</SelectItem>
                        <SelectItem value="catering">Catering</SelectItem>
                        <SelectItem value="supplier">Tedarikçi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {loginData.companyType && (
                    <div className="space-y-2">
                      <Label htmlFor="corpCompany">Şirket</Label>
                      <div className="relative">
                        <Input
                          placeholder="Şirket adı yazın..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          className="pr-8"
                        />
                        {searchingCompanies && (
                          <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 transform -translate-y-1/2" />
                        )}
                      </div>
                      {companies.length > 0 && (
                        <div className="border rounded-md max-h-40 overflow-y-auto">
                          {companies.map((company) => (
                            <div
                              key={company.id}
                              className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                console.log('Corporate tab - Company selected:', company); // Debug log
                                setLoginData(prev => {
                                  const updated = {...prev, companyId: company.id};
                                  console.log('Corporate tab - Updated loginData:', updated); // Debug log
                                  return updated;
                                });
                                setCompanySearch(company.name);
                                setCompanies([]);
                              }}
                            >
                              <div className="font-medium">{company.name}</div>
                              <div className="text-sm text-gray-500">{company.slug}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="corpPhone">Telefon</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="corpPhone"
                        type="tel"
                        placeholder="+90 555 123 4567"
                        value={loginData.phone}
                        onChange={(e) => setLoginData(prev => ({...prev, phone: e.target.value}))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="corpPassword">Şifre</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="corpPassword"
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({...prev, password: e.target.value}))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={loading || !loginData.companyId}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Kurumsal Giriş
                  </Button>
                </form>

                <Separator />

                <div className="text-center">
                  <Button 
                    variant="link" 
                    onClick={() => setActiveTab('corp-register')}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    Kurumsal hesap başvurusu yapın
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Corporate Application Form - Hidden Tab */}
            {activeTab === 'corp-register' && (
              <div className="mt-4 space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold">Kurumsal Hesap Başvurusu</h3>
                  <p className="text-sm text-gray-600">Var olan şirkette hesap veya yeni şirket başvurusu</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="applicationMode">Başvuru Tipi</Label>
                    <Select 
                      value={registerData.applicationMode || ''} 
                      onValueChange={(value) => setRegisterData(prev => ({...prev, applicationMode: value, companyId: '', companyType: ''}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Başvuru tipini seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="existing">Var olan şirkette hesap başvurusu</SelectItem>
                        <SelectItem value="new">Yeni şirket başvurusu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {registerData.applicationMode === 'existing' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="appCompanyType">Şirket Tipi</Label>
                        <Select 
                          value={registerData.companyType} 
                          onValueChange={(value) => setRegisterData(prev => ({...prev, companyType: value, companyId: ''}))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Şirket tipini seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="corporate">Firma</SelectItem>
                            <SelectItem value="catering">Catering</SelectItem>
                            <SelectItem value="supplier">Tedarikçi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {registerData.companyType && (
                        <div className="space-y-2">
                          <Label htmlFor="appCompany">Şirket</Label>
                          <div className="relative">
                            <Input
                              placeholder="Şirket adı yazın..."
                              value={companySearch}
                              onChange={(e) => setCompanySearch(e.target.value)}
                              className="pr-8"
                            />
                            {searchingCompanies && (
                              <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 transform -translate-y-1/2" />
                            )}
                          </div>
                          {companies.length > 0 && (
                            <div className="border rounded-md max-h-40 overflow-y-auto">
                              {companies.map((company) => (
                                <div
                                  key={company.id}
                                  className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                  onClick={() => {
                                    console.log('Corporate App - Company selected:', company);
                                    setRegisterData(prev => {
                                      const updated = {...prev, companyId: company.id};
                                      console.log('Corporate App - Updated registerData:', updated);
                                      return updated;
                                    });
                                    setCompanySearch(company.name);
                                    setCompanies([]);
                                  }}
                                >
                                  <div className="font-medium">{company.name}</div>
                                  <div className="text-sm text-gray-500">{company.slug}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {registerData.applicationMode === 'new' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="newCompanyType">Şirket Tipi</Label>
                        <Select 
                          value={registerData.companyType} 
                          onValueChange={(value) => setRegisterData(prev => ({...prev, companyType: value}))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Şirket tipini seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="corporate">Firma</SelectItem>
                            <SelectItem value="catering">Catering</SelectItem>
                            <SelectItem value="supplier">Tedarikçi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newCompanyName">Şirket Adı</Label>
                        <Input
                          id="newCompanyName"
                          type="text"
                          placeholder="Şirket adını girin"
                          value={registerData.newCompanyName || ''}
                          onChange={(e) => setRegisterData(prev => ({...prev, newCompanyName: e.target.value}))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newCompanyAddress">Şirket Adresi</Label>
                        <Input
                          id="newCompanyAddress"
                          type="text"
                          placeholder="Şirket adresi (örn: Levent, İstanbul)"
                          value={registerData.newCompanyAddress || ''}
                          onChange={(e) => setRegisterData(prev => ({...prev, newCompanyAddress: e.target.value}))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newCompanyPhone">Şirket Telefonu</Label>
                        <Input
                          id="newCompanyPhone"
                          type="tel"
                          placeholder="+90 212 999 0000"
                          value={registerData.newCompanyPhone || ''}
                          onChange={(e) => setRegisterData(prev => ({...prev, newCompanyPhone: e.target.value}))}
                          required
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="appFullName">Yetkili Ad Soyad</Label>
                    <Input
                      id="appFullName"
                      type="text"
                      placeholder="Adınız ve soyadınız"
                      value={registerData.fullName}
                      onChange={(e) => setRegisterData(prev => ({...prev, fullName: e.target.value}))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appPhone">Yetkili Telefon</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="appPhone"
                        type="tel"
                        placeholder="+90 555 123 4567"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData(prev => ({...prev, phone: e.target.value}))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appEmail">E-posta</Label>
                    <Input
                      id="appEmail"
                      type="email"
                      placeholder="email@domain.com"
                      value={registerData.email || ''}
                      onChange={(e) => setRegisterData(prev => ({...prev, email: e.target.value}))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appPassword">Şifre</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="appPassword"
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData(prev => ({...prev, password: e.target.value}))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appConfirmPassword">Şifre Tekrar</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="appConfirmPassword"
                        type="password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData(prev => ({...prev, confirmPassword: e.target.value}))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleCorporateApplication}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={loading || !isApplicationFormValid()}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Başvuru Gönder
                  </Button>
                </div>

                <Separator />

                <div className="text-center">
                  <Button 
                    variant="link" 
                    onClick={() => setActiveTab('corporate')}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    Giriş yapmak için tıklayın
                  </Button>
                </div>
              </div>
            )}

            {/* Register Form - Hidden Tab */}
            {activeTab === 'register' && (
              <div className="mt-4 space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold">Bireysel Kayıt</h3>
                  <p className="text-sm text-gray-600">Yeni hesap oluşturun</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="regFullName">Ad Soyad</Label>
                    <Input
                      id="regFullName"
                      type="text"
                      placeholder="Adınız ve soyadınız"
                      value={registerData.fullName}
                      onChange={(e) => setRegisterData(prev => ({...prev, fullName: e.target.value}))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regCompanyType">Şirket Tipi</Label>
                    <Select 
                      value={registerData.companyType} 
                      onValueChange={(value) => setRegisterData(prev => ({...prev, companyType: value, companyId: ''}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Şirket tipini seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corporate">Firma</SelectItem>
                        <SelectItem value="catering">Catering</SelectItem>
                        <SelectItem value="supplier">Tedarikçi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {registerData.companyType && (
                    <div className="space-y-2">
                      <Label htmlFor="regCompany">Şirket</Label>
                      <div className="relative">
                        <Input
                          placeholder="Şirket adı yazın..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          className="pr-8"
                        />
                        {searchingCompanies && (
                          <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 transform -translate-y-1/2" />
                        )}
                      </div>
                      {companies.length > 0 && (
                        <div className="border rounded-md max-h-40 overflow-y-auto">
                          {companies.map((company) => (
                            <div
                              key={company.id}
                              className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                console.log('Register - Company selected:', company); // Debug log
                                setRegisterData(prev => {
                                  const updated = {...prev, companyId: company.id};
                                  console.log('Register - Updated registerData:', updated); // Debug log
                                  return updated;
                                });
                                setCompanySearch(company.name);
                                setCompanies([]);
                              }}
                            >
                              <div className="font-medium">{company.name}</div>
                              <div className="text-sm text-gray-500">{company.slug}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="regPhone">Telefon</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="regPhone"
                        type="tel"
                        placeholder="+90 555 123 4567"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData(prev => ({...prev, phone: e.target.value}))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regPassword">Şifre</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="regPassword"
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData(prev => ({...prev, password: e.target.value}))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regConfirmPassword">Şifre Tekrar</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="regConfirmPassword"
                        type="password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData(prev => ({...prev, confirmPassword: e.target.value}))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={loading || !registerData.companyId}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Kayıt Ol
                  </Button>
                </form>

                <Separator />

                <div className="text-center">
                  <Button 
                    variant="link" 
                    onClick={() => setActiveTab('individual')}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    Zaten hesabınız var mı? Giriş yapın
                  </Button>
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;