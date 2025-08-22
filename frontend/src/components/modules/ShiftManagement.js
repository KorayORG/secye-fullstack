import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Users,
  Search,
  Filter,
  Copy,
  Settings,
  BarChart3
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || process.env.REACT_APP_BACKEND_URL;

const ShiftManagement = ({ companyId, userRole, companyType = 'corporate' }) => {
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [filteredShifts, setFilteredShifts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shiftStats, setShiftStats] = useState({
    total_shifts: 0,
    active_shifts: 0,
    total_employees_assigned: 0
  });
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  
  // Form states
  const [shiftForm, setShiftForm] = useState({
    title: '',
    start_time: '09:00',
    end_time: '17:00',
    days: [],
    timezone: 'Europe/Istanbul',
    description: '',
    is_active: true,
    max_employees: null,
    break_duration: 60,
    is_overtime_allowed: false
  });

  const dayNames = {
    1: 'Pazartesi',
    2: 'Salı',
    3: 'Çarşamba',
    4: 'Perşembe',
    5: 'Cuma',
    6: 'Cumartesi',
    7: 'Pazar'
  };

  useEffect(() => {
    loadShifts();
  }, [companyId]);

  const loadShifts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API}/corporate/${companyId}/shifts`);
      setShifts(response.data.shifts || []);
    } catch (err) {
      console.error('Shift loading error:', err);
      setError('Vardiyalar yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async () => {
    if (!shiftForm.title || !shiftForm.start_time || !shiftForm.end_time || shiftForm.days.length === 0) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API}/corporate/${companyId}/shifts`, shiftForm);
      
      setSuccess('Vardiya başarıyla oluşturuldu');
      setShowCreateDialog(false);
      resetForm();
      loadShifts();
    } catch (err) {
      console.error('Shift creation error:', err);
      setError('Vardiya oluşturma sırasında hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      title: shift.title,
      start_time: shift.start_time,
      end_time: shift.end_time,
      days: shift.days,
      timezone: shift.timezone
    });
    setShowEditDialog(true);
  };

  const handleUpdateShift = async () => {
    if (!editingShift) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.put(`${API}/corporate/${companyId}/shifts/${editingShift.id}`, shiftForm);
      
      setSuccess('Vardiya başarıyla güncellendi');
      setShowEditDialog(false);
      resetForm();
      loadShifts();
    } catch (err) {
      console.error('Shift update error:', err);
      setError('Vardiya güncelleme sırasında hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm('Bu vardiyayı silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.delete(`${API}/corporate/${companyId}/shifts/${shiftId}`);
      
      setSuccess('Vardiya başarıyla silindi');
      loadShifts();
    } catch (err) {
      console.error('Shift deletion error:', err);
      setError('Vardiya silme sırasında hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShiftForm({
      title: '',
      start_time: '09:00',
      end_time: '17:00',
      days: [],
      timezone: 'Europe/Istanbul'
    });
    setEditingShift(null);
  };

  const handleDayToggle = (day) => {
    const newDays = shiftForm.days.includes(day)
      ? shiftForm.days.filter(d => d !== day)
      : [...shiftForm.days, day].sort();
    
    setShiftForm({ ...shiftForm, days: newDays });
  };

  const formatDays = (days) => {
    if (days.length === 0) return 'Gün seçilmemiş';
    if (days.length === 7) return 'Her gün';
    if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return 'Hafta içi';
    if (days.length === 2 && days.includes(6) && days.includes(7)) return 'Hafta sonu';
    
    return days.map(d => dayNames[d]).join(', ');
  };

  const formatTime = (timeStr) => {
    return timeStr ? timeStr.substring(0, 5) : '';
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight shifts
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}s ${minutes > 0 ? minutes + 'd' : ''}`;
  };

  const canManageShifts = () => {
    return userRole && (userRole.includes('Owner') || userRole.includes('4') || userRole.includes('3'));
  };

  if (loading && shifts.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Vardiyalar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vardiya Yönetimi</h2>
          <p className="text-gray-600">Çalışma saatlerini ve vardiyaları düzenleyin</p>
        </div>
        {canManageShifts() && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Vardiya
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Yeni Vardiya Oluştur</DialogTitle>
                <DialogDescription>
                  Yeni bir çalışma vardiyası tanımlayın
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Vardiya Adı</label>
                  <Input
                    value={shiftForm.title}
                    onChange={(e) => setShiftForm({ ...shiftForm, title: e.target.value })}
                    placeholder="örn: Sabah Vardiyası"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Başlama Saati</label>
                    <Input
                      type="time"
                      value={shiftForm.start_time}
                      onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Bitiş Saati</label>
                    <Input
                      type="time"
                      value={shiftForm.end_time}
                      onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Çalışma Günleri</label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(dayNames).map(([day, name]) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDayToggle(parseInt(day))}
                        className={`p-2 text-xs rounded border ${
                          shiftForm.days.includes(parseInt(day))
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {name.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
                
                {shiftForm.start_time && shiftForm.end_time && (
                  <div className="text-sm text-gray-600">
                    Toplam süre: {calculateDuration(shiftForm.start_time, shiftForm.end_time)}
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                  İptal
                </Button>
                <Button onClick={handleCreateShift} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Oluştur
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Shift List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shifts.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Henüz vardiya tanımlanmamıştır</p>
                {canManageShifts() && (
                  <p className="text-sm text-gray-400 mt-2">
                    İlk vardiyayı oluşturmak için "Yeni Vardiya" butonunu kullanın
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          shifts.map((shift) => (
            <Card key={shift.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{shift.title}</CardTitle>
                    <CardDescription>
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </CardDescription>
                  </div>
                  <Badge variant={shift.is_active ? "default" : "secondary"}>
                    {shift.is_active ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{formatDays(shift.days)}</span>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{calculateDuration(shift.start_time, shift.end_time)}</span>
                  </div>
                  
                  {canManageShifts() && (
                    <div className="flex space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditShift(shift)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteShift(shift.id)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Shift Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vardiya Düzenle</DialogTitle>
            <DialogDescription>
              Vardiya bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Vardiya Adı</label>
              <Input
                value={shiftForm.title}
                onChange={(e) => setShiftForm({ ...shiftForm, title: e.target.value })}
                placeholder="örn: Sabah Vardiyası"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Başlama Saati</label>
                <Input
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Bitiş Saati</label>
                <Input
                  type="time"
                  value={shiftForm.end_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Çalışma Günleri</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(dayNames).map(([day, name]) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(parseInt(day))}
                    className={`p-2 text-xs rounded border ${
                      shiftForm.days.includes(parseInt(day))
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {name.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            
            {shiftForm.start_time && shiftForm.end_time && (
              <div className="text-sm text-gray-600">
                Toplam süre: {calculateDuration(shiftForm.start_time, shiftForm.end_time)}
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }}>
              İptal
            </Button>
            <Button onClick={handleUpdateShift} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Güncelle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShiftManagement;