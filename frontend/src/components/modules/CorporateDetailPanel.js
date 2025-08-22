import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CorporateDetailPanel = ({ cateringCompanyId, corporate, onBack }) => {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tab === 'stats') fetchStats();
  }, [tab]);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/catering/${cateringCompanyId}/corporates/${corporate.id}/stats`);
      setStats(res.data.stats);
    } catch (err) {
      setError('İstatistikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button variant="outline" onClick={onBack} className="mb-4">Geri</Button>
      <Card>
        <CardHeader>
          <CardTitle>{corporate.name}</CardTitle>
          <CardDescription>{corporate.phone}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="stats">İstatistikler</TabsTrigger>
              <TabsTrigger value="menus">Menüler</TabsTrigger>
              <TabsTrigger value="requests">İstek/Öneriler</TabsTrigger>
            </TabsList>
            <TabsContent value="stats">
              {loading ? 'Yükleniyor...' : error ? <div className="text-red-500">{error}</div> : (
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(stats, null, 2)}</pre>
              )}
            </TabsContent>
            <TabsContent value="menus">
              <div>Menü yönetimi arayüzü buraya gelecek.</div>
            </TabsContent>
            <TabsContent value="requests">
              <div>İstek/Öneriler arayüzü buraya gelecek.</div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CorporateDetailPanel;
