
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StoreStock = ({ companyId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (companyId) fetchProducts();
    // eslint-disable-next-line
  }, [companyId]);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/supplier/${companyId}/products`);
      setProducts(res.data.products || []);
    } catch (err) {
      setError('Stoklar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Stok Takip</h3>
      {loading && <div>Yükleniyor...</div>}
      {error && <div className="text-red-600">{error}</div>}
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Adı</th>
              <th className="p-2 border">Stok Miktarı</th>
              <th className="p-2 border">Birim</th>
              <th className="p-2 border">Fiyat</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={4} className="text-center p-4">Henüz ürün yok.</td></tr>
            ) : (
              products.map((product, idx) => (
                <tr key={idx}>
                  <td className="p-2 border">{product.name}</td>
                  <td className="p-2 border">{product.stock_quantity}</td>
                  <td className="p-2 border">{product.unit_type}</td>
                  <td className="p-2 border">₺{product.unit_price}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StoreStock;
