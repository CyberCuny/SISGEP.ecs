const messagePatterns = [
  {
    match: (n) =>
      n.notification_type === 'approval' && n.related_object_type === 'Activity' && n.meta?.activity_id,
    key: 'notif.approval',
    vars: (n) => ({ activity_desc: n.meta.activity_desc }),
  },
  {
    match: (n) =>
      n.notification_type === 'approval' && n.related_object_type === 'SchedulePeriod',
    key: 'notif.approval_cron',
    vars: (n) => ({ activity_desc: n.meta.activity_desc }),
  },
  {
    match: (n) =>
      n.notification_type === 'rejection' && n.related_object_type === 'Activity' && n.meta?.activity_id,
    key: 'notif.rejection',
    vars: (n) => ({ activity_desc: n.meta.activity_desc }),
  },
  {
    match: (n) =>
      n.notification_type === 'rejection' && n.related_object_type === 'SchedulePeriod',
    key: 'notif.rejection_cron',
    vars: (n) => ({ activity_desc: n.meta.activity_desc }),
  },
  {
    match: (n) =>
      n.notification_type === 'message' && n.related_object_type === 'Message',
    key: 'notif.message_new',
    vars: (n) => ({ sender_name: n.meta.sender_name, message_subject: n.meta.message_subject }),
  },
  {
    match: (n) =>
      n.notification_type === 'assignment' && n.related_object_type === 'Activity' && n.meta?.unit_id && !n.meta?.user_id,
    key: 'notif.assignment_unit',
    vars: (n) => ({ activity_desc: n.meta.activity_desc }),
  },
  {
    match: (n) =>
      n.notification_type === 'assignment' && n.related_object_type === 'OrganizationalUnit',
    key: 'notif.assignment_batch_unit',
    vars: (n) => ({ count: n.meta.count }),
  },
];

export function getNotificationMessage(notification, t) {
  for (const pattern of messagePatterns) {
    if (pattern.match(notification)) {
      return t(pattern.key, pattern.vars(notification));
    }
  }
  if (notification.meta?.activity_desc && (notification.message || '').startsWith('Nuevo periodo')) {
    return t('notif.assignment_period_created', { activity_desc: notification.meta.activity_desc });
  }
  if (notification.meta?.activity_desc && (notification.message || '').includes('Periodo actualizado')) {
    return t('notif.assignment_period_updated', { activity_desc: notification.meta.activity_desc });
  }
  if (notification.meta?.activity_desc && notification.meta?.unit_name && (notification.message || '').includes('subunidad')) {
    return t('notif.assignment_distributed', { activity_desc: notification.meta.activity_desc });
  }
  if (notification.meta?.activity_desc && (notification.message || '').includes('responsable')) {
    return t('notif.assignment_responsible', { activity_desc: notification.meta.activity_desc });
  }
  if (notification.meta?.activity_desc && (notification.message || '').includes('participante')) {
    return t('notif.assignment_participant', { activity_desc: notification.meta.activity_desc });
  }
  if (notification.meta?.activity_desc && (notification.message || '').includes('vinculó')) {
    return t('notif.assignment_map', { activity_desc: notification.meta.activity_desc });
  }
  if (notification.meta?.activity_desc && (notification.message || '').includes('importada') && (notification.message || '').includes('responsable')) {
    return t('notif.import_responsible', { activity_desc: notification.meta.activity_desc });
  }
  if (notification.meta?.activity_desc && (notification.message || '').includes('importada') && (notification.message || '').includes('participante')) {
    return t('notif.import_participant', { activity_desc: notification.meta.activity_desc });
  }
  if (notification.notification_type === 'system' && notification.meta?.roles) {
    const roles = Array.isArray(notification.meta.roles) ? notification.meta.roles.join(', ') : notification.meta.roles;
    if ((notification.message || '').includes('asignaron')) {
      return t('notif.system_role_assign', { roles });
    }
    return t('notif.system_role_remove', { roles });
  }
  return notification.message;
}
