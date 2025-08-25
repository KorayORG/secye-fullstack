
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StoreStats = ({ companyId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    if (companyId) fetchStats();
    // eslint-disable-next-line
  }, [companyId, period]);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/supplier/${companyId}/stats`, { params: { period } });
      setStats(res.data);
    } catch (err) {
      setError('İstatistikler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">İstatistikler</h3>
      <div className="mb-4">
        <label className="mr-2">Dönem:</label>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="border rounded px-2 py-1">
          <option value="day">Son 1 Gün</option>
          <option value="week">Son 1 Hafta</option>
          <option value="month">Son 1 Ay</option>
          <option value="year">Son 1 Yıl</option>
        </select>
      </div>
      {loading && <div>Yükleniyor...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {stats && (
        <div className="space-y-2">
          <div>Toplam Satış: <b>{stats.total_sales}</b></div>
          <div>Toplam Gelir: <b>₺{stats.total_revenue}</b></div>
          <div>En Çok Satılan Ürün: <b>{stats.top_product}</b></div>
          {/* Diğer detaylı istatistikler buraya eklenebilir */}
        </div>
      )}
    </div>
  );
};

export default StoreStats;
