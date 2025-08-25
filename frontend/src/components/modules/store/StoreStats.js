
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
      // Period değerini backend'in beklediği formata çevir
      let backendPeriod = period;
      if (period === 'day') backendPeriod = '1_day';
      if (period === 'week') backendPeriod = '1_week';
      if (period === 'month') backendPeriod = '1_month';
      if (period === 'year') backendPeriod = '1_year';
      
      const res = await axios.get(`${API}/supplier/${companyId}/stats`, { 
        params: { period: backendPeriod } 
      });
      setStats(res.data);
    } catch (err) {
      setError('İstatistikler yüklenemedi: ' + (err.response?.data?.detail || err.message));
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Sipariş İstatistikleri</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Toplam Sipariş:</span>
                <span className="font-semibold">{stats.total_orders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Teslim Edilenler:</span>
                <span className="font-semibold text-green-600">{stats.delivered_orders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Bekleyenler:</span>
                <span className="font-semibold text-yellow-600">{stats.pending_orders || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Finansal Durum</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Toplam Gelir:</span>
                <span className="font-semibold text-green-600">₺{stats.total_revenue?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span>Ortalama Sipariş:</span>
                <span className="font-semibold">
                  ₺{stats.total_orders > 0 ? (stats.total_revenue / stats.total_orders).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Ürün Durumu</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Toplam Ürün:</span>
                <span className="font-semibold">{stats.total_products || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Düşük Stok:</span>
                <span className="font-semibold text-red-600">{stats.low_stock_products || 0}</span>
              </div>
            </div>
          </div>

          {stats.low_stock_items && stats.low_stock_items.length > 0 && (
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Düşük Stoklu Ürünler</h4>
              <div className="space-y-1">
                {stats.low_stock_items.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="text-red-600">{item.stock_quantity} adet</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoreStats;
