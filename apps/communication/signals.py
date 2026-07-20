from django.db.models.signals import post_delete
from django.dispatch import receiver
from apps.activities.models import Activity
from apps.schedule.models import SchedulePeriod
from .models import Notification


@receiver(post_delete, sender=Activity)
def delete_activity_notifications(sender, instance, **kwargs):
    Notification.objects.filter(
        related_object_id=instance.id,
        related_object_type='Activity'
    ).delete()


@receiver(post_delete, sender=SchedulePeriod)
def delete_schedule_period_notifications(sender, instance, **kwargs):
    Notification.objects.filter(
        related_object_id=instance.id,
        related_object_type='SchedulePeriod'
    ).delete()
