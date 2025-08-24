

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const initialForm = {
  name: '',
  description: '',
  price: '',
  quantity: '',
  unit: 'Adet',
};

const units = ['gr', 'kg', 'L', 'mL', 'Adet'];

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StoreProducts = ({ companyId }) => {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ürünleri backend'den çek
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
      setError('Ürünler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (index = null) => {
    if (index !== null) {
      const p = products[index];
      setForm({
        name: p.name,
        description: p.description,
        price: p.unit_price,
        quantity: p.stock_quantity,
        unit: p.unit_type,
      });
      setEditId(p.id);
    } else {
      setForm(initialForm);
      setEditId(null);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setForm(initialForm);
    setEditId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editId) {
        // Ürün güncelle
        await axios.put(`${API}/supplier/${companyId}/products/${editId}`, {
          name: form.name,
          description: form.description,
          unit_price: parseFloat(form.price),
          stock_quantity: parseFloat(form.quantity),
          unit_type: form.unit,
        });
      } else {
        // Yeni ürün ekle
        await axios.post(`${API}/supplier/${companyId}/products`, {
          name: form.name,
          description: form.description,
          unit_price: parseFloat(form.price),
          stock_quantity: parseFloat(form.quantity),
          unit_type: form.unit,
        });
      }
      await fetchProducts();
      handleCloseForm();
    } catch (err) {
      setError('Ürün kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    setLoading(true);
    setError('');
    try {
      const product = products[index];
      await axios.delete(`${API}/supplier/${companyId}/products/${product.id}`);
      await fetchProducts();
    } catch (err) {
      setError('Ürün silinemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Ürünler</h3>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
        onClick={() => handleOpenForm()}
      >
        Ürün Ekle
      </button>

      {/* Ürün Listesi */}
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Adı</th>
              <th className="p-2 border">Açıklama</th>
              <th className="p-2 border">Fiyat</th>
              <th className="p-2 border">Miktar</th>
              <th className="p-2 border">Birim</th>
              <th className="p-2 border">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={6} className="text-center p-4">Henüz ürün yok.</td></tr>
            ) : (
              products.map((product, idx) => (
                <tr key={idx}>
                  <td className="p-2 border">{product.name}</td>
                  <td className="p-2 border">{product.description}</td>
                  <td className="p-2 border">{product.price}</td>
                  <td className="p-2 border">{product.quantity}</td>
                  <td className="p-2 border">{product.unit}</td>
                  <td className="p-2 border">
                    <button className="text-blue-600 mr-2" onClick={() => handleOpenForm(idx)}>Düzenle</button>
                    <button className="text-red-600" onClick={() => handleDelete(idx)}>Sil</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Ürün Ekle/Düzenle Formu Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={handleCloseForm}>×</button>
            <h4 className="text-lg font-bold mb-4">{editId !== null ? 'Ürünü Düzenle' : 'Ürün Ekle'}</h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block mb-1">Ürün Adı</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block mb-1">Açıklama</label>
                <textarea name="description" value={form.description} onChange={handleChange} required className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block mb-1">Fiyat</label>
                <input type="number" name="price" value={form.price} onChange={handleChange} required min="0" step="0.01" className="w-full border rounded px-2 py-1" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block mb-1">Miktar</label>
                  <input type="number" name="quantity" value={form.quantity} onChange={handleChange} required min="0" step="0.01" className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block mb-1">Birim</label>
                  <select name="unit" value={form.unit} onChange={handleChange} className="border rounded px-2 py-1">
                    {units.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded w-full mt-2">Kaydet</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreProducts;
