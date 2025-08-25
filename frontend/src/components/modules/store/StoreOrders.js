
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StoreOrders = ({ companyId }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (companyId) fetchOrders();
    // eslint-disable-next-line
  }, [companyId]);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/orders`, {
        params: { supplier_id: companyId }
      });
      setOrders(res.data.orders || []);
    } catch (err) {
      setError('Siparişler yüklenemedi: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Siparişler</h3>
      {loading && <div>Yükleniyor...</div>}
      {error && <div className="text-red-600">{error}</div>}
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Alıcı</th>
              <th className="p-2 border">Ürün</th>
              <th className="p-2 border">Miktar</th>
              <th className="p-2 border">Birim</th>
              <th className="p-2 border">Fiyat</th>
              <th className="p-2 border">Durum</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={6} className="text-center p-4">Henüz sipariş yok.</td></tr>
            ) : (
              orders.map((order, idx) => (
                <tr key={idx}>
                  <td className="p-2 border">{order.buyer_name}</td>
                  <td className="p-2 border">{order.product_name}</td>
                  <td className="p-2 border">{order.quantity}</td>
                  <td className="p-2 border">{order.unit}</td>
                  <td className="p-2 border">₺{order.price}</td>
                  <td className="p-2 border">{order.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StoreOrders;
