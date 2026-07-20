import api from './api';

export const activityService = {
  list: (params) => api.get('/activities/', { params }),
  get: (id) => api.get(`/activities/${id}/`),
  create: (data) => api.post('/activities/', data),
  update: (id, data) => api.patch(`/activities/${id}/`, data),
  delete: (id) => api.delete(`/activities/${id}/`),
  importActivities: (formData) => api.post('/activities/import_activities/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  mapToUser: (data) => api.post('/activities/map_to_user/', data),
  assignToUnits: (data) => api.post('/activities/assign_to_units/', data),
  distribute: (data) => api.post('/activities/distribute_to_subunits/', data),
  approveSubunit: (data) => api.post('/activities/approve_subunit_activity/', data),
  rejectSubunitActivity: (data) => api.post('/activities/reject_subunit_activity/', data),
  approveSubunitCronograms: (data) => api.post('/activities/approve_subunit_cronograms/', data),
};

export const scheduleService = {
  list: (params) => api.get('/schedule/periods/', { params }),
  get: (id) => api.get(`/schedule/periods/${id}/`),
  create: (data) => api.post('/schedule/periods/', data),
  update: (id, data) => api.patch(`/schedule/periods/${id}/`, data),
  delete: (id) => api.delete(`/schedule/periods/${id}/`),
  calendar: (params) => api.get('/schedule/periods/calendar/', { params }),
  individualCalendar: (params) => api.get('/schedule/periods/individual_calendar/', { params }),
  annualCalendar: (params) => api.get('/schedule/periods/annual_calendar/', { params }),
  complianceStats: (params) => api.get('/schedule/periods/compliance_stats/', { params }),
  updateStatus: (id, data) => api.post(`/schedule/periods/${id}/update_single_status/`, data),
  dragDrop: (id, data) => api.patch(`/schedule/periods/${id}/drag_drop/`, data),
  saveBatch: (data) => api.post('/schedule/work-days/save_batch/', data),
};

export const userService = {
  list: (params) => api.get('/users/', { params }),
  get: (id) => api.get(`/users/${id}/`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.patch(`/users/${id}/`, data),
  delete: (id) => api.delete(`/users/${id}/`),
  me: () => api.get('/users/me/'),
  meUpdate: (data) => api.patch('/users/me_update/', data),
  login: (data) => api.post('/users/login/', data),
  logout: () => api.post('/users/logout/'),
  changePassword: (id, data) => api.post(`/users/${id}/change_password/`, data),
  resetPassword: (id, data) => api.post(`/users/${id}/reset_password/`, data),
  assignRoles: (data) => api.post('/users/assign_roles/', data),
  removeRoles: (data) => api.post('/users/remove_roles/', data),
  ldapList: () => api.get('/users/ldap_list/'),
  importLdap: (data) => api.post('/users/import_ldap/', data),
  register: (data) => api.post('/users/register/', data),
  forgotPassword: (data) => api.post('/users/forgot_password/', data),
  resetPasswordConfirm: (data) => api.post('/users/reset_password_confirm/', data),
};

export const reportService = {
  individual: (params) => api.get('/schedule/reports/individual/', { params, responseType: 'blob' }),
  exportIcs: (params) => api.get('/schedule/reports/export_ics/', { params, responseType: 'blob' }),
  importTemplate: (params) => api.get('/schedule/reports/import_template/', { params, responseType: 'blob' }),
  compliancePdf: (params) => api.get('/schedule/reports/compliance_pdf/', { params, responseType: 'blob' }),
  byUo: (params) => api.get('/schedule/reports/by_uo/', { params, responseType: 'blob' }),
  comparative: (params) => api.get('/schedule/reports/comparative/', { params, responseType: 'blob' }),
};

export const notificationService = {
  list: (params) => api.get('/notifications/', { params }),
  get: (id) => api.get(`/notifications/${id}/`),
  markRead: (id) => api.post(`/notifications/${id}/mark_read/`),
  markAllRead: () => api.post('/notifications/mark_all_read/'),
  unreadCount: () => api.get('/notifications/unread_count/'),
};

export const messageService = {
  list: (params) => api.get('/messages/', { params }),
  get: (id) => api.get(`/messages/${id}/`),
  create: (data) => api.post('/messages/', data),
  inbox: (params) => api.get('/messages/inbox/', { params }),
  sent: (params) => api.get('/messages/sent/', { params }),
  markRead: (id) => api.post(`/messages/${id}/mark_read/`),
  unreadCount: () => api.get('/messages/unread_count/'),
};

export const backupService = {
  list: () => api.get('/backups/'),
  create: () => api.post('/backups/'),
  restore: (name) => api.post('/backups/restore/', { name }),
};

export const unitService = {
  list: (params) => api.get('/organizational-units/', { params }),
  get: (id) => api.get(`/organizational-units/${id}/`),
  create: (data) => api.post('/organizational-units/', data),
  update: (id, data) => api.patch(`/organizational-units/${id}/`, data),
  delete: (id) => api.delete(`/organizational-units/${id}/`),
  tree: () => api.get('/organizational-units/tree/'),
  move: (id, parentId, position) => api.patch('/organizational-units/drag_drop/', { id, parent_id: parentId, position }),
};

export const catalogService = {
  categories: {
    list: (params) => api.get('/categories/', { params }),
    create: (data) => api.post('/categories/', data),
    update: (id, data) => api.patch(`/categories/${id}/`, data),
    delete: (id) => api.delete(`/categories/${id}/`),
  },
  activityTypes: {
    list: (params) => api.get('/activity-types/', { params }),
    create: (data) => api.post('/activity-types/', data),
    update: (id, data) => api.patch(`/activity-types/${id}/`, data),
    delete: (id) => api.delete(`/activity-types/${id}/`),
  },
  arcs: {
    list: (params) => api.get('/arcs/', { params }),
    create: (data) => api.post('/arcs/', data),
    update: (id, data) => api.patch(`/arcs/${id}/`, data),
    delete: (id) => api.delete(`/arcs/${id}/`),
  },
  objectives: {
    list: (params) => api.get('/objectives/', { params }),
    create: (data) => api.post('/objectives/', data),
    update: (id, data) => api.patch(`/objectives/${id}/`, data),
    delete: (id) => api.delete(`/objectives/${id}/`),
  },
  criteria: {
    list: (params) => api.get('/criteria/', { params }),
    create: (data) => api.post('/criteria/', data),
    update: (id, data) => api.patch(`/criteria/${id}/`, data),
    delete: (id) => api.delete(`/criteria/${id}/`),
  },
  guidelines: {
    list: (params) => api.get('/guidelines/', { params }),
    create: (data) => api.post('/guidelines/', data),
    update: (id, data) => api.patch(`/guidelines/${id}/`, data),
    delete: (id) => api.delete(`/guidelines/${id}/`),
  },
};

export const emailConfigService = {
  list: () => api.get('/email-config/'),
  create: (data) => api.post('/email-config/', data),
  update: (id, data) => api.patch(`/email-config/${id}/`, data),
  test: (email) => api.post('/email-config/test/', { email }),
};

export const approvedPlanService = {
  list: (params) => api.get('/schedule/approved-plans/', { params }),
  get: (id) => api.get(`/schedule/approved-plans/${id}/`),
  create: (data) => api.post('/schedule/approved-plans/', data),
  update: (id, data) => api.patch(`/schedule/approved-plans/${id}/`, data),
  delete: (id) => api.delete(`/schedule/approved-plans/${id}/`),
};

export const systemConfigService = {
  list: () => api.get('/system-config/'),
  get: (id) => api.get(`/system-config/${id}/`),
  create: (data) => api.post('/system-config/', data),
  update: (id, data) => api.patch(`/system-config/${id}/`, data),
  delete: (id) => api.delete(`/system-config/${id}/`),
};
