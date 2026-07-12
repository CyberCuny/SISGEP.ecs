import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Users as UsersIcon, Edit3, Key, Trash2, UserPlus, X, Check } from 'lucide-react';
import { hasAnyRole, ROLES } from '../utils/roles';

export default function Users() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canAdmin = user?.is_staff || hasAnyRole(user, [ROLES.DIRECTOR]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ username: '', display_name: '', email: '', password: '', position: '', plan_approver: '', is_disabled: false });
  const [resetResult, setResetResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const pageSize = 50;
  const [showLDAP, setShowLDAP] = useState(false);
  const [ldapUsers, setLdapUsers] = useState([]);
  const [loadingLDAP, setLoadingLDAP] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const fetchData = () => {
    api.get(`/users/?page=${page}`).then(r => {
      setUsers(r.data.results || r.data || []);
      setCount(r.data.count || 0);
    });
    api.get('/roles/').then(r => setAllRoles(r.data.results || r.data || []));
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingUser) {
        const payload = { ...form };
        delete payload.password;
        await api.patch(`/users/${editingUser}/`, payload);
        toast.success(t('toast.user_updated'));
      } else {
        await api.post('/users/', form);
        toast.success(t('toast.user_created'));
      }
      setShowForm(false); setEditingUser(null);
      setForm({ username: '', display_name: '', email: '', password: '', position: '', plan_approver: '', is_disabled: false });
      fetchData();
    } catch { toast.error(t('toast.user_save_error')); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    setConfirmDelete({ id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/users/${confirmDelete.id}/`);
      toast.success(t('toast.user_deleted'));
      fetchData();
    } catch { toast.error(t('toast.delete_error')); }
    finally { setConfirmDelete(null); }
  };

  const handleResetPassword = async (id) => {
    try {
      const res = await api.post(`/users/${id}/reset_password/`);
      setResetResult(res.data.new_password);
    } catch { toast.error(t('toast.password_reset_error')); }
  };

  const handleAssignRole = async (userId, roleId, assign) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const currentRoles = u.roles || [];
      const newRoles = assign
        ? [...currentRoles, allRoles.find(r => r.id === roleId)].filter(Boolean)
        : currentRoles.filter(r => r.id !== roleId);
      return { ...u, roles: newRoles };
    }));
    try {
      if (assign) {
        await api.post('/users/assign_roles/', { user_ids: [userId], role_ids: [roleId] });
      } else {
        await api.post('/users/remove_roles/', { user_ids: [userId], role_ids: [roleId] });
      }
      toast.success(assign ? t('toast.role_assigned') : t('toast.role_removed'));
      fetchData();
    } catch {
      toast.error(t('toast.role_error'));
      fetchData();
    }
  };

  const handleImportLDAP = async (ldapUser) => {
    try {
      await api.post('/users/import_ldap/', ldapUser);
      toast.success(t('toast.user_imported', { username: ldapUser.username }));
      fetchData();
      setLdapUsers(prev => prev.filter(u => u.username !== ldapUser.username));
    } catch { toast.error(t('toast.ldap_import_error')); }
  };

  const existingUsernames = new Set(users.map(u => u.username));

  return (
    <div>
      <div className="page-header">
        <h1>{t('page.users.title')}</h1>
          <button className="btn btn-icon btn-primary" onClick={() => { setEditingUser(null); setForm({ username: '', display_name: '', email: '', password: '', position: '', plan_approver: '' }); setShowForm(true); }} title={t('page.users.new')}>
            <Plus size={16} />
          </button>
          <button className="btn btn-icon btn-secondary" onClick={() => { setShowLDAP(true); setLoadingLDAP(true); api.get('/users/ldap_list/').then(r => setLdapUsers(r.data || [])).catch(() => setLdapUsers([])).finally(() => setLoadingLDAP(false)); }} title={t('page.users.import_ldap')}>
            <UsersIcon size={16} />
          </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" style={{ width: '500px' }} onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? t('page.users.edit_title') : t('page.users.create_title')}</h2>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('page.users.username')}</label>
                  <input value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>{t('page.users.display_name')}</label>
                  <input value={form.display_name} onChange={(e) => setForm({...form, display_name: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label>{t('page.users.email')}</label>
                <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('page.users.position')}</label>
                  <input value={form.position} onChange={(e) => setForm({...form, position: e.target.value})} />
                </div>
                {!editingUser && (
                  <div className="form-group">
                    <label>{t('page.users.password')}</label>
                    <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required={!editingUser} />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>{t('page.users.plan_approver')}</label>
                <select value={form.plan_approver} onChange={(e) => setForm({...form, plan_approver: e.target.value})}>
                  <option value="">{t('page.users.select')}</option>
                  {users.filter(u => !editingUser || u.id !== editingUser).map(u => (
                    <option key={u.id} value={u.id}>{u.display_name || u.username}</option>
                  ))}
                </select>
              </div>
              {editingUser && (
                <div className="form-group">
                  <label>
                    <input type="checkbox" checked={form.is_disabled} onChange={(e) => setForm({...form, is_disabled: e.target.checked})} />
                    {' '}{t('page.users.disabled')}
                  </label>
                </div>
              )}
              <div className="form-actions">
                <button className="btn btn-icon btn-secondary" type="button" onClick={() => setShowForm(false)} title={t('page.users.cancel')}><X size={16} /></button>
                <button className="btn btn-icon btn-primary" type="submit" disabled={loading} title={loading ? t('common.saving') : (editingUser ? t('page.users.update') : t('page.users.create'))}>
                  <Check size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetResult && (
        <div className="modal-overlay" onClick={() => setResetResult(null)}>
          <div className="modal-content" style={{ width: '400px' }} onClick={(e) => e.stopPropagation()}>
            <h2>{t('page.users.password_reset_title')}</h2>
            <div className="alert alert-success">
              {t('form.new_password')}: <strong>{resetResult}</strong>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {t('page.users.password_reset_copy')}
            </p>
            <div className="form-actions">
              <button className="btn btn-icon btn-primary" onClick={() => setResetResult(null)} title={t('page.users.close')}><X size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {showLDAP && (
        <div className="modal-overlay" onClick={() => setShowLDAP(false)}>
          <div className="modal-content" style={{ width: '700px' }} onClick={(e) => e.stopPropagation()}>
            <h2>{t('page.users.ldap_title')}</h2>
            {loadingLDAP ? <Spinner /> : ldapUsers.length === 0 ? (
              <div className="empty-state">{t('page.users.ldap_empty')}</div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>{t('page.users.ldap_table.user')}</th><th>{t('page.users.ldap_table.name')}</th><th>{t('page.users.ldap_table.email')}</th><th>{t('page.users.ldap_table.position')}</th><th>{t('page.users.ldap_table.actions')}</th></tr>
                  </thead>
                  <tbody>
                    {ldapUsers.map((lu) => (
                      <tr key={lu.username}>
                        <td>{lu.username}</td>
                        <td>{lu.display_name}</td>
                        <td>{lu.email || '-'}</td>
                        <td>{lu.position || '-'}</td>
                        <td>
                          {existingUsernames.has(lu.username) ? (
                            <span className="badge badge-neutral">{t('badge.exists')}</span>
                          ) : (
                            <button className="btn btn-icon btn-sm btn-success" onClick={() => handleImportLDAP(lu)} title={t('page.users.ldap_import')}><UserPlus size={14} /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="form-actions">
              <button className="btn btn-icon btn-secondary" onClick={() => setShowLDAP(false)} title={t('page.users.close')}><X size={16} /></button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('page.users.table.user')}</th><th>{t('page.users.table.name')}</th><th>{t('page.users.table.email')}</th><th>{t('page.users.table.position')}</th>
                {canAdmin && <th>{t('page.users.table.roles')}</th>}<th>{t('page.users.table.approver')}</th>{canAdmin && <th>{t('page.users.table.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.display_name}</td>
                  <td>{u.email}</td>
                  <td>{u.position || '-'}</td>
                  {canAdmin && <td>
                    {allRoles.map(r => (
                      <label key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginRight: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={(u.roles || []).some(ur => ur.id === r.id)}
                          onChange={(e) => handleAssignRole(u.id, r.id, e.target.checked)} />
                        {r.name}
                      </label>
                    ))}
                  </td>}
                  <td>{u.plan_approver_name || '-'}</td>
                  {canAdmin && <td>
                    <button className="btn btn-icon btn-sm btn-primary" onClick={() => { setEditingUser(u.id); setForm({ username: u.username, display_name: u.display_name, email: u.email, password: '', position: u.position || '', plan_approver: u.plan_approver || '', is_disabled: u.is_disabled || false }); setShowForm(true); }} title={t('common.edit')}><Edit3 size={14} /></button>
                    <button className="btn btn-icon btn-sm btn-warning" onClick={() => handleResetPassword(u.id)} title={t('action.reset_password')}><Key size={14} /></button>
                    <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleDelete(u.id)} title={t('common.delete')}><Trash2 size={14} /></button>
                  </td>}
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={canAdmin ? 7 : 4} className="empty-state">{t('page.users.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination count={count} page={page} pageSize={pageSize} onPageChange={setPage} />
      </div>
      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.confirm')}
        message={t('confirm.delete_user')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
