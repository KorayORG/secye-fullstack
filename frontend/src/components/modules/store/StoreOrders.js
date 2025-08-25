
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
                <th className="py-2 px-3 text-left text-sm font-semibold">Ürün Detayları</th>
                <th className="py-2 px-3 text-left text-sm font-semibold">Toplam Tutar</th>
                <th className="py-2 px-3 text-left text-sm font-semibold">Durum</th>
                <th className="py-2 px-3 text-left text-sm font-semibold">Tarih</th>
                <th className="py-2 px-3 text-left text-sm font-semibold">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b">
                  <td className="py-2 px-3">
                    <div className="font-medium">{order.buyer_company_name || order.catering_id}</div>
                  </td>
                  <td className="py-2 px-3">
                    {order.items && order.items.length > 0 ? (
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="bg-gray-50 p-2 rounded text-sm">
                            <div className="font-semibold text-gray-800">
                              {item.product_name || item.product_id}
                            </div>
                            <div className="text-gray-600 text-xs">
                              Miktar: <span className="font-medium">{item.quantity || '-'}</span> {item.unit_type || item.unit || ''}
                            </div>
                            <div className="text-gray-600 text-xs">
                              Birim Fiyat: <span className="font-medium">₺{item.unit_price ? Number(item.unit_price).toFixed(2) : '-'}</span>
                            </div>
                            <div className="text-gray-600 text-xs">
                              Toplam: <span className="font-medium">₺{item.total_price ? Number(item.total_price).toFixed(2) : (item.quantity * item.unit_price).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">Ürün bilgisi yok</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-semibold text-green-600">₺{order.total_amount?.toFixed(2) || '0.00'}</div>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status === 'pending' ? 'Beklemede' :
                       order.status === 'confirmed' ? 'Onaylandı' :
                       order.status === 'preparing' ? 'Hazırlanıyor' :
                       order.status === 'delivered' ? 'Teslim Edildi' :
                       order.status === 'cancelled' ? 'İptal Edildi' :
                       order.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-sm">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="py-2 px-3">
                    <select
                      className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={order.status}
                      disabled={orderStatusUpdating[order.id]}
                      onChange={e => handleOrderStatusChange(order.id, e.target.value)}
                    >
                      <option value="pending">Beklemede</option>
                      <option value="confirmed">Onaylandı</option>
                      <option value="preparing">Hazırlanıyor</option>
                      <option value="delivered">Teslim Edildi</option>
                      <option value="cancelled">İptal Edildi</option>
                    </select>
                    {orderStatusUpdating[order.id] && (
                      <div className="text-xs text-gray-500 mt-1">Güncelleniyor...</div>
                    )}
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
