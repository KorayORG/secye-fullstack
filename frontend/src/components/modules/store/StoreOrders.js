
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StoreOrders = ({ companyId }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderStatusUpdating, setOrderStatusUpdating] = useState({});

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

  const handleOrderStatusChange = async (orderId, newStatus) => {
    setOrderStatusUpdating((prev) => ({ ...prev, [orderId]: true }));
    try {
      await axios.patch(`${API}/orders/${orderId}`, { status: newStatus });
      setOrders((prev) => prev.map(order => order.id === orderId ? { ...order, status: newStatus } : order));
    } catch (err) {
      alert('Durum güncellenemedi: ' + (err.response?.data?.detail || err.message));
    } finally {
      setOrderStatusUpdating((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Siparişler</h3>
      {loading && <div>Yükleniyor...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {orders.length === 0 ? (
        <div className="text-center p-8 text-gray-500">Sipariş bulunamadı</div>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-3 text-left text-sm font-semibold">Alıcı</th>
                <th className="py-2 px-3 text-left text-sm font-semibold">Ürünler</th>
                <th className="py-2 px-3 text-left text-sm font-semibold">Toplam Tutar</th>
                <th className="py-2 px-3 text-left text-sm font-semibold">Durum</th>
                <th className="py-2 px-3 text-left text-sm font-semibold">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b">
                  <td className="py-2 px-3">{order.buyer_company_name || order.catering_id}</td>
                  <td className="py-2 px-3">
                    {order.items && order.items.length > 0 ? (
                      <ul className="list-disc ml-4">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="mb-1 text-sm">
                            <span className="font-semibold">{item.product_name || item.product_id}</span>
                            {" - "}
                            <span>{item.quantity || '-'} {item.unit_type || item.unit || ''}</span>
                            {" - "}
                            <span>₺{item.unit_price ? Number(item.unit_price).toFixed(2) : '-'}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td className="py-2 px-3">₺{order.total_amount?.toFixed(2) || '0.00'}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-sm">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString('tr-TR') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StoreOrders;
