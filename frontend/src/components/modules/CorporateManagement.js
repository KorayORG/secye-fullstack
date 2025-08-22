import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CorporateManagement = ({ cateringCompanyId, onSelectCorporate }) => {
  const [tab, setTab] = useState('all');
  const [corporates, setCorporates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCorporates();
  }, [tab]);

  const fetchCorporates = async () => {
    setLoading(true);
    setError('');
    try {
      let url = '';
      if (tab === 'all') {
        url = `${API}/catering/${cateringCompanyId}/corporates`;
      } else {
        url = `${API}/catering/${cateringCompanyId}/partner-corporates`;
      }
      const res = await axios.get(url);
      setCorporates(res.data.corporates || []);
    } catch (err) {
      setError('Firmalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex space-x-4 mb-4">
        <Button variant={tab === 'all' ? 'default' : 'outline'} onClick={() => setTab('all')}>Tüm Firmalar</Button>
        <Button variant={tab === 'partner' ? 'default' : 'outline'} onClick={() => setTab('partner')}>Anlaşmalı Firmalar</Button>
      </div>
      {loading && <div>Yükleniyor...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {corporates.map(corp => (
          <Card key={corp.id}>
            <CardHeader>
              <CardTitle>{corp.name}</CardTitle>
              <CardDescription>{corp.phone}</CardDescription>
            </CardHeader>
            <CardContent>
              {corp.active_individual_count !== undefined && (
                <div className="flex justify-between text-sm mb-1">
                  <span>Aktif Bireysel Kullanıcı:</span>
                  <span className="font-medium">{corp.active_individual_count}</span>
                </div>
              )}
              {corp.total_individual_count !== undefined && (
                <div className="flex justify-between text-sm mb-1">
                  <span>Toplam Bireysel Kullanıcı:</span>
                  <span className="font-medium">{corp.total_individual_count}</span>
                </div>
              )}
              <Button size="sm" className="mt-2 w-full" onClick={() => onSelectCorporate(corp)}>Detay</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CorporateManagement;
