import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import { useTranslation } from 'react-i18next';
import { Pen, X, Send } from 'lucide-react';
import Modal from '../components/Modal';

export default function Messages() {
  const [tab, setTab] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState({ recipient: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const toast = useToast();
  const { t } = useTranslation();
  const pageSize = 30;

  const fetchMessages = () => {
    setLoading(true);
    const endpoint = tab === 'inbox' ? 'inbox' : 'sent';
    api.get(`/messages/${endpoint}/?page=${page}`).then(r => {
      setMessages(r.data.results || r.data || []);
      setCount(r.data.count || 0);
    }).catch(() => console.warn('Failed to fetch messages')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchMessages(); }, [tab, page]);

  useEffect(() => {
    api.get('/users/').then(r => setUsers(r.data.results || r.data || [])).catch(() => console.warn('Failed to load users'));
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!composeForm.recipient || !composeForm.subject || !composeForm.body) {
      toast.error(t('toast.complete_fields'));
      return;
    }
    setSending(true);
    try {
      await api.post('/messages/', composeForm);
      toast.success(t('toast.message_sent'));
      setShowCompose(false);
      setComposeForm({ recipient: '', subject: '', body: '' });
      if (tab === 'sent') fetchMessages();
    } catch { toast.error(t('toast.message_send_error')); }
    finally { setSending(false); }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.post(`/messages/${id}/mark_read/`);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read_at: new Date().toISOString() } : m));
    } catch {}
  };

  const viewMessage = (msg) => {
    setSelectedMsg(msg);
    if (tab === 'inbox' && !msg.read_at) handleMarkRead(msg.id);
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('page.messages.title')}</h1>
        <button className="btn btn-icon btn-primary" onClick={() => setShowCompose(true)} title={t('page.messages.new')}>
          <Pen size={16} />
        </button>
      </div>

      <Modal open={showCompose} onClose={() => setShowCompose(false)} width="550px">
        <h2>{t('page.messages.compose_title')}</h2>
        <form onSubmit={handleSend}>
          <div className="form-group">
            <label>{t('page.messages.recipient')}</label>
            <select value={composeForm.recipient} onChange={(e) => setComposeForm({...composeForm, recipient: e.target.value})} required>
              <option value="">{t('form.select')}</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.username}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{t('page.messages.subject')}</label>
            <input value={composeForm.subject} onChange={(e) => setComposeForm({...composeForm, subject: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>{t('page.messages.body')}</label>
            <textarea rows={6} value={composeForm.body} onChange={(e) => setComposeForm({...composeForm, body: e.target.value})} required />
          </div>
          <div className="form-actions">
            <button className="btn btn-icon btn-secondary" type="button" onClick={() => setShowCompose(false)} title={t('page.messages.cancel')}><X size={16} /></button>
            <button className="btn btn-icon btn-primary" type="submit" disabled={sending} title={sending ? t('page.messages.sending') : t('page.messages.send')}>
              <Send size={16} />
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!selectedMsg} onClose={() => setSelectedMsg(null)} width="600px">
        <h2>{selectedMsg?.subject}</h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          <strong>{t('page.messages.from_label')}</strong> {selectedMsg?.sender_name || selectedMsg?.sender} &nbsp;|&nbsp;
          <strong>{t('page.messages.to_label')}</strong> {selectedMsg?.recipient_name || selectedMsg?.recipient} &nbsp;|&nbsp;
          <strong>{new Date(selectedMsg?.created_at).toLocaleString()}</strong>
          {selectedMsg?.read_at && <span> &nbsp;|&nbsp; <em>{t('badge.read')}: {new Date(selectedMsg.read_at).toLocaleString()}</em></span>}
        </div>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selectedMsg?.body}</div>
        <div className="form-actions">
          <button className="btn btn-icon btn-primary" onClick={() => setSelectedMsg(null)} title={t('page.messages.close')}><X size={16} /></button>
        </div>
      </Modal>

      <div className="card">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button className={`btn btn-sm ${tab === 'inbox' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('inbox'); setPage(1); }}>{t('page.messages.tab_inbox')}</button>
          <button className={`btn btn-sm ${tab === 'sent' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('sent'); setPage(1); }}>{t('page.messages.tab_sent')}</button>
        </div>
        {loading ? <Spinner /> : messages.length === 0 ? (
          <div className="empty-state">{t('page.messages.empty')}</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{tab === 'inbox' ? t('page.messages.table.from') : t('page.messages.table.to')}</th>
                  <th>{t('page.messages.table.subject')}</th>
                  <th>{t('page.messages.table.date')}</th>
                  <th>{t('page.messages.table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {messages.map(m => (
                  <tr key={m.id} onClick={() => viewMessage(m)}
                    style={{ cursor: 'pointer', fontWeight: tab === 'inbox' && !m.read_at ? '600' : 'normal' }}>
                    <td>{tab === 'inbox' ? (m.sender_name || t('badge.unknown')) : (m.recipient_name || t('badge.unknown'))}</td>
                    <td>{m.subject}</td>
                    <td>{new Date(m.created_at).toLocaleDateString()}</td>
                    <td>{tab === 'inbox' && !m.read_at ? <span className="badge badge-info">{t('badge.new')}</span> : (m.read_at ? t('badge.read') : t('badge.sent'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination count={count} page={page} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  );
}
