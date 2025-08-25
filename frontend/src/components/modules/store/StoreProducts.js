


import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogTrigger, DialogContent, DialogHeader } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import * as Select from '../../ui/select';

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
    const product = products[index];
    if (!product || !product.id || !companyId) {
      setError('Silinecek ürün veya şirket bilgisi eksik.');
      return;
    }
    if (!window.confirm(`"${product.name}" adlı ürünü silmek istediğinize emin misiniz?`)) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.delete(`${API}/supplier/${companyId}/products/${product.id}`);
      if (response.data && response.data.success) {
        await fetchProducts();
      } else {
        setError(response.data?.message || 'Ürün silinemedi (API yanıtı başarısız).');
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Ürün silinemedi (sunucu hatası).'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Ürünler</h3>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogTrigger asChild>
          <Button variant="default" size="default" className="mb-4" onClick={() => handleOpenForm()}>
            Ürün Ekle
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <h4 className="text-lg font-bold mb-4">{editId !== null ? 'Ürünü Düzenle' : 'Ürün Ekle'}</h4>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Ürün Adı</label>
              <Input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Ürün adı" />
            </div>
            <div>
              <label className="block mb-1 font-medium">Açıklama</label>
              <Textarea name="description" value={form.description} onChange={handleChange} required placeholder="Ürün açıklaması" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block mb-1 font-medium">Fiyat</label>
                <Input type="number" name="price" value={form.price} onChange={handleChange} required min="0" step="0.01" placeholder="0.00" />
              </div>
              <div className="flex-1">
                <label className="block mb-1 font-medium">Miktar</label>
                <Input type="number" name="quantity" value={form.quantity} onChange={handleChange} required min="0" step="0.01" placeholder="0" />
              </div>
              <div className="w-32">
                <label className="block mb-1 font-medium">Birim</label>
                <Select.Select name="unit" value={form.unit} onValueChange={val => setForm(f => ({ ...f, unit: val }))}>
                  <Select.SelectTrigger>
                    <Select.SelectValue placeholder="Birim" />
                  </Select.SelectTrigger>
                  <Select.SelectContent>
                    {units.map((u) => (
                      <Select.SelectItem key={u} value={u}>{u}</Select.SelectItem>
                    ))}
                  </Select.SelectContent>
                </Select.Select>
              </div>
            </div>
            <Button type="submit" variant="default" size="default" className="w-full mt-2 font-semibold">Kaydet</Button>
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          </form>
        </DialogContent>
      </Dialog>

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
                  <td className="p-2 border">{product.unit_price}</td>
                  <td className="p-2 border">{product.stock_quantity}</td>
                  <td className="p-2 border">{product.unit_type}</td>
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

  {/* ... */}
    </div>
  );
};

export default StoreProducts;
