import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Mail, 
  Plus, 
  Send,
  Inbox,
  Sent,
  Archive,
  Trash2,
  Star,
  Reply,
  Forward,
  Search,
  Paperclip,
  Users,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle,
  MoreVertical,
  User,
  Calendar
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MailSystem = ({ companyId, userId, userRole, companyType = 'corporate' }) => {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('inbox');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  
  // Form states
  const [composeForm, setComposeForm] = useState({
    to_addresses: [],
    subject: '',
    body: '',
    labels: []
  });
  
  const [replyForm, setReplyForm] = useState({
    body: ''
  });

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    loadMessages();
    loadEmployees();
  }, [companyId, activeTab]);

  const loadMessages = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API}/${companyType}/${companyId}/messages`, {
        params: {
          user_id: userId,
          type: activeTab,
          limit: 50
        }
      });
      
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error('Messages loading error:', err);
      setError('Mesajlar yüklenirken hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await axios.get(`${API}/corporate/${companyId}/employees`, {
        params: { limit: 100 }
      });
      
      setEmployees(response.data.users || []);
    } catch (err) {
      console.error('Employees loading error:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!composeForm.to_addresses.length || !composeForm.subject || !composeForm.body) {
      setError('Lütfen tüm gerekli alanları doldurun');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API}/${companyType}/${companyId}/messages`, {
        ...composeForm,
        from_user_id: userId,
        from_company_id: companyId
      });
      
      setSuccess('Mesaj başarıyla gönderildi');
      setShowComposeDialog(false);
      resetComposeForm();
      loadMessages();
    } catch (err) {
      console.error('Message send error:', err);
      setError('Mesaj gönderme sırasında hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReplyMessage = async () => {
    if (!selectedMessage || !replyForm.body) {
      setError('Yanıt mesajı boş olamaz');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API}/corporate/${companyId}/messages`, {
        to_addresses: [selectedMessage.from_address],
        subject: `Re: ${selectedMessage.subject}`,
        body: replyForm.body,
        from_user_id: userId,
        from_company_id: companyId,
        labels: ['reply']
      });
      
      setSuccess('Yanıt başarıyla gönderildi');
      setShowReplyDialog(false);
      setReplyForm({ body: '' });
      loadMessages();
    } catch (err) {
      console.error('Reply send error:', err);
      setError('Yanıt gönderme sırasında hata oluştu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      await axios.put(`${API}/corporate/${companyId}/messages/${messageId}`, {
        is_read: true
      });
      
      loadMessages();
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Bu mesajı silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await axios.delete(`${API}/corporate/${companyId}/messages/${messageId}`);
      
      setSuccess('Mesaj silindi');
      setSelectedMessage(null);
      loadMessages();
    } catch (err) {
      console.error('Delete message error:', err);
      setError('Mesaj silme sırasında hata oluştu');
    }
  };

  const resetComposeForm = () => {
    setComposeForm({
      to_addresses: [],
      subject: '',
      body: '',
      labels: []
    });
  };

  const isMessageRead = (message) => {
    return message.read_by && message.read_by.includes(userId);
  };

  const getUserEmailAddress = (userId) => {
    const employee = employees.find(emp => emp.id === userId);
    return employee ? `${employee.full_name} <${employee.email || `${employee.id}@company.sy`}>` : userId;
  };

  const filteredMessages = messages.filter(message =>
    message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.from_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMessagePreview = (body) => {
    return body.length > 100 ? body.substring(0, 100) + '...' : body;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Dün';
    } else if (diffDays < 7) {
      return `${diffDays} gün önce`;
    } else {
      return date.toLocaleDateString('tr-TR');
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Mail sistemi yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Site İçi Mail</h2>
          <p className="text-gray-600">Şirket içi iletişim ve mesajlaşma</p>
        </div>
        <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Mesaj
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni Mesaj Oluştur</DialogTitle>
              <DialogDescription>
                Şirket çalışanlarına mesaj gönderin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Alıcılar</label>
                <Select
                  value="select_recipient"
                  onValueChange={(value) => {
                    if (value && value !== "select_recipient" && !composeForm.to_addresses.includes(value)) {
                      setComposeForm({
                        ...composeForm,
                        to_addresses: [...composeForm.to_addresses, value]
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alıcı seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={getUserEmailAddress(employee.id)}>
                        {employee.full_name} ({employee.role || 'Bireysel'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {composeForm.to_addresses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {composeForm.to_addresses.map((address, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center">
                        {address}
                        <button
                          onClick={() => {
                            setComposeForm({
                              ...composeForm,
                              to_addresses: composeForm.to_addresses.filter((_, i) => i !== index)
                            });
                          }}
                          className="ml-2 text-xs"
                        >
                          ✕
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium">Konu</label>
                <Input
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                  placeholder="Mesaj konusu"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Mesaj</label>
                <textarea
                  className="w-full h-32 p-3 border rounded-md resize-none"
                  value={composeForm.body}
                  onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                  placeholder="Mesajınızı yazın..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => { setShowComposeDialog(false); resetComposeForm(); }}>
                İptal
              </Button>
              <Button onClick={handleSendMessage} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Gönder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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

      {/* Mail Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mail Kutusu</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('inbox')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 ${
                    activeTab === 'inbox' ? 'bg-orange-50 text-orange-700 border-r-2 border-orange-500' : ''
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                  <span>Gelen Kutusu</span>
                </button>
                <button
                  onClick={() => setActiveTab('sent')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 ${
                    activeTab === 'sent' ? 'bg-orange-50 text-orange-700 border-r-2 border-orange-500' : ''
                  }`}
                >
                  <Sent className="w-4 h-4" />
                  <span>Gönderilen</span>
                </button>
                <button
                  onClick={() => setActiveTab('archived')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 ${
                    activeTab === 'archived' ? 'bg-orange-50 text-orange-700 border-r-2 border-orange-500' : ''
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  <span>Arşiv</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  {activeTab === 'inbox' && 'Gelen Mesajlar'}
                  {activeTab === 'sent' && 'Gönderilen Mesajlar'}
                  {activeTab === 'archived' && 'Arşivlenen Mesajlar'}
                  <span className="text-sm text-gray-500 ml-2">({filteredMessages.length})</span>
                </CardTitle>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Mesajlarda ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {activeTab === 'inbox' && 'Henüz mesaj almadınız'}
                    {activeTab === 'sent' && 'Henüz mesaj göndermediniz'}
                    {activeTab === 'archived' && 'Arşivlenen mesaj bulunmuyor'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => {
                        setSelectedMessage(message);
                        if (!isMessageRead(message)) {
                          handleMarkAsRead(message.id);
                        }
                      }}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        !isMessageRead(message) ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                      } ${selectedMessage?.id === message.id ? 'bg-orange-50' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${!isMessageRead(message) ? 'font-bold' : ''}`}>
                              {activeTab === 'sent' ? message.to_addresses[0] : message.from_address}
                            </span>
                            {message.labels && message.labels.includes('reply') && (
                              <Badge variant="outline" className="text-xs">Yanıt</Badge>
                            )}
                          </div>
                          <p className={`text-sm mt-1 ${!isMessageRead(message) ? 'font-semibold' : 'text-gray-600'}`}>
                            {message.subject}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getMessagePreview(message.body)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {message.attachments && message.attachments.length > 0 && (
                            <Paperclip className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-xs text-gray-500">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Message Detail Dialog */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle>{selectedMessage.subject}</DialogTitle>
                  <DialogDescription className="mt-2">
                    <div className="flex items-center space-x-4 text-sm">
                      <span>Gönderen: {selectedMessage.from_address}</span>
                      <span>Tarih: {new Date(selectedMessage.created_at).toLocaleString('tr-TR')}</span>
                    </div>
                  </DialogDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReplyDialog(true)}
                  >
                    <Reply className="w-4 h-4 mr-1" />
                    Yanıtla
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteMessage(selectedMessage.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedMessage.body}
                </div>
              </div>
              
              {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Ekler:</h4>
                  <div className="space-y-2">
                    {selectedMessage.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                        <Paperclip className="w-4 h-4" />
                        <span className="text-sm">{attachment.name}</span>
                        <Button variant="outline" size="sm">İndir</Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reply Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mesajı Yanıtla</DialogTitle>
            <DialogDescription>
              "{selectedMessage?.subject}" konulu mesajı yanıtlayın
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Alıcı</label>
              <Input
                value={selectedMessage?.from_address || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Yanıt Mesajı</label>
              <textarea
                className="w-full h-32 p-3 border rounded-md resize-none"
                value={replyForm.body}
                onChange={(e) => setReplyForm({ ...replyForm, body: e.target.value })}
                placeholder="Yanıtınızı yazın..."
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowReplyDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleReplyMessage} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Yanıtla
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MailSystem;