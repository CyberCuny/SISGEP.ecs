import datetime
import logging
import threading
from django.core.mail import EmailMessage, get_connection
from django.core.cache import cache

logger = logging.getLogger(__name__)


def send_email_async(subject, message, recipient_list, html_message=None):
    thread = threading.Thread(target=send_email_with_config, args=(subject, message, recipient_list), kwargs={'html_message': html_message})
    thread.daemon = True
    thread.start()


def log_action(request, modelo, accion, object_id=None, data_diff=None):
    from apps.logs.models import LogEntry
    now = datetime.datetime.now()
    LogEntry.objects.create(
        fecha=now.date(), hora=now.time(),
        username=request.user.username,
        modelo=modelo, accion=accion,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        object_id=object_id,
        data_diff=data_diff
    )


def compute_diff(old_instance, new_data, fields):
    diff = {}
    for f in fields:
        old_val = str(getattr(old_instance, f, ''))
        new_val = str(new_data.get(f, ''))
        if old_val != new_val:
            diff[f] = {'old': old_val, 'new': new_val}
    return diff if diff else None


def get_user_unit_tree(user):
    """Retorna QuerySet de UOs donde user es responsable, incluyendo todas las hijas recursivamente."""
    from apps.core.models import OrganizationalUnit
    direct_uos = OrganizationalUnit.objects.filter(responsible=user)
    all_ids = set(direct_uos.values_list('id', flat=True))
    queue = list(all_ids)
    while queue:
        children = OrganizationalUnit.objects.filter(parent_id__in=queue).values_list('id', flat=True)
        new_ids = set(children) - all_ids
        if not new_ids:
            break
        all_ids.update(new_ids)
        queue = list(new_ids)
    return OrganizationalUnit.objects.filter(id__in=all_ids)


def send_email_with_config(subject, message, recipient_list, html_message=None):
    cfg = cache.get('email_config')
    if not cfg:
        from django.conf import settings
        from django.core.mail import send_mail
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipient_list, fail_silently=True)
        return
    try:
        connection = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=cfg.get('host', 'localhost'),
            port=cfg.get('port', 25),
            username=cfg.get('username') or None,
            password=cfg.get('password') or None,
            use_tls=cfg.get('use_tls', False),
            use_ssl=cfg.get('use_ssl', False),
            fail_silently=True,
        )
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=cfg.get('default_from') or cfg.get('username') or 'noreply@example.com',
            to=recipient_list,
            connection=connection,
        )
        if html_message:
            email.content_subtype = 'html'
        email.send()
    except Exception:
        logger.exception('Error sending email')
