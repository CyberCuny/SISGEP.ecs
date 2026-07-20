from rest_framework import serializers
from .models import Activity, ActivityResponsible, ActivityParticipant, ActivityGuideline, ActivityOrgUnit, ActivityMapping, UnfulfilledActivity, ActivityAttachment, ActivityComment


class ActivitySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    organizational_unit_name = serializers.CharField(source='organizational_unit.name', read_only=True)
    arc_name = serializers.CharField(source='arc.name', read_only=True)
    activity_type_name = serializers.CharField(source='activity_type.name', read_only=True)
    associated_objective_name = serializers.CharField(source='associated_objective.name', read_only=True)
    measurement_criterion_name = serializers.CharField(source='measurement_criterion.name', read_only=True)
    responsible_user_name = serializers.SerializerMethodField()
    responsible_user_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    participant_user_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    responsible_user_id_list = serializers.SerializerMethodField()
    participant_user_id_list = serializers.SerializerMethodField()
    responsible_user_names = serializers.SerializerMethodField()
    participant_user_names = serializers.SerializerMethodField()
    guideline_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    schedule_periods = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)

    def validate_schedule_periods(self, value):
        import datetime
        for i, sp in enumerate(value):
            sd = sp.get('start_date')
            ed = sp.get('end_date')
            if sd and ed:
                if isinstance(sd, str): sd = datetime.date.fromisoformat(sd)
                if isinstance(ed, str): ed = datetime.date.fromisoformat(ed)
                if sd > ed:
                    raise serializers.ValidationError(f'El periodo {i+1} tiene fecha fin anterior a la fecha inicio')
            st = sp.get('start_time')
            et = sp.get('end_time')
            if st and et:
                if isinstance(st, str): st = datetime.time.fromisoformat(st)
                if isinstance(et, str): et = datetime.time.fromisoformat(et)
                if st >= et:
                    raise serializers.ValidationError(f'El periodo {i+1} tiene hora fin no posterior a la hora inicio')
        return value

    class Meta:
        model = Activity
        fields = '__all__'

    def get_responsible_user_name(self, obj):
        return obj.responsible_user.display_name if obj.responsible_user else None

    def get_responsible_user_names(self, obj):
        return [u.display_name for u in obj.responsible_users.all()]

    def get_participant_user_names(self, obj):
        return [u.display_name for u in obj.participant_users.all()]

    def get_responsible_user_id_list(self, obj):
        return list(obj.responsible_users.values_list('id', flat=True))

    def get_participant_user_id_list(self, obj):
        return list(obj.participant_users.values_list('id', flat=True))

    def create(self, validated_data):
        responsible_ids = validated_data.pop('responsible_user_ids', [])
        participant_ids = validated_data.pop('participant_user_ids', [])
        guideline_ids = validated_data.pop('guideline_ids', [])
        schedule_periods_data = validated_data.pop('schedule_periods', [])
        instance = super().create(validated_data)
        for uid in responsible_ids:
            ActivityResponsible.objects.get_or_create(activity=instance, user_id=uid)
            ActivityMapping.objects.get_or_create(activity=instance, user_id=uid)
        for uid in participant_ids:
            ActivityParticipant.objects.get_or_create(activity=instance, user_id=uid)
            ActivityMapping.objects.get_or_create(activity=instance, user_id=uid)
        for gid in guideline_ids:
            ActivityGuideline.objects.get_or_create(activity=instance, guideline_id=gid)
        if instance.organizational_unit:
            ActivityOrgUnit.objects.get_or_create(
                activity=instance,
                organizational_unit=instance.organizational_unit,
                defaults={'status': ''}
            )
        from apps.schedule.models import SchedulePeriod, ScheduleOrgUnit
        for sp_data in schedule_periods_data:
            extraplan = sp_data.get('is_extraplan', False)
            sp = SchedulePeriod.objects.create(
                activity=instance,
                start_date=sp_data.get('start_date'),
                end_date=sp_data.get('end_date'),
                start_time=sp_data.get('start_time'),
                end_time=sp_data.get('end_time'),
                status='CUMPLIDO' if extraplan else 'PENDIENTE',
                is_extraplan=extraplan,
            )
            if instance.organizational_unit:
                ScheduleOrgUnit.objects.get_or_create(
                    schedule_period=sp,
                    organizational_unit=instance.organizational_unit,
                    defaults={'status': ''}
                )
        return instance

    def update(self, instance, validated_data):
        responsible_ids = validated_data.pop('responsible_user_ids', None)
        participant_ids = validated_data.pop('participant_user_ids', None)
        guideline_ids = validated_data.pop('guideline_ids', None)
        schedule_periods_data = validated_data.pop('schedule_periods', None)
        instance = super().update(instance, validated_data)
        if responsible_ids is not None:
            instance.responsible_relations.exclude(user_id__in=responsible_ids).delete()
            existing = set(instance.responsible_relations.values_list('user_id', flat=True))
            for uid in responsible_ids:
                if uid not in existing:
                    ActivityResponsible.objects.get_or_create(activity=instance, user_id=uid)
                    ActivityMapping.objects.get_or_create(activity=instance, user_id=uid)
            # Clean up mappings for users no longer responsible nor participant
            participant_ids_current = set(instance.participant_relations.values_list('user_id', flat=True))
            removed = set(instance.activitymapping_set.values_list('user_id', flat=True)) - set(responsible_ids) - participant_ids_current
            instance.activitymapping_set.filter(user_id__in=removed).delete()
        if participant_ids is not None:
            instance.participant_relations.exclude(user_id__in=participant_ids).delete()
            existing = set(instance.participant_relations.values_list('user_id', flat=True))
            for uid in participant_ids:
                if uid not in existing:
                    ActivityParticipant.objects.get_or_create(activity=instance, user_id=uid)
                    ActivityMapping.objects.get_or_create(activity=instance, user_id=uid)
            # Clean up mappings for users no longer participant nor responsible
            responsible_ids_current = set(instance.responsible_relations.values_list('user_id', flat=True))
            removed = set(instance.activitymapping_set.values_list('user_id', flat=True)) - set(participant_ids) - responsible_ids_current
            instance.activitymapping_set.filter(user_id__in=removed).delete()
        if guideline_ids is not None:
            instance.activityguideline_set.exclude(guideline_id__in=guideline_ids).delete()
            existing = set(instance.activityguideline_set.values_list('guideline_id', flat=True))
            for gid in guideline_ids:
                if gid not in existing:
                    ActivityGuideline.objects.get_or_create(activity=instance, guideline_id=gid)
        if schedule_periods_data is not None:
            from apps.schedule.models import SchedulePeriod, ScheduleOrgUnit
            incoming_ids = {sp.get('id') for sp in schedule_periods_data if sp.get('id')}
            SchedulePeriod.objects.filter(activity=instance).exclude(id__in=incoming_ids).delete()
            for sp_data in schedule_periods_data:
                sp_id = sp_data.get('id')
                extraplan = sp_data.get('is_extraplan', False)
                if sp_id:
                    SchedulePeriod.objects.filter(id=sp_id, activity=instance).update(
                        start_date=sp_data.get('start_date'),
                        end_date=sp_data.get('end_date'),
                        start_time=sp_data.get('start_time'),
                        end_time=sp_data.get('end_time'),
                        is_extraplan=extraplan,
                    )
                else:
                    sp = SchedulePeriod.objects.create(
                        activity=instance,
                        start_date=sp_data.get('start_date'),
                        end_date=sp_data.get('end_date'),
                        start_time=sp_data.get('start_time'),
                        end_time=sp_data.get('end_time'),
                        status='CUMPLIDO' if extraplan else 'PENDIENTE',
                        is_extraplan=extraplan,
                    )
                    if instance.organizational_unit:
                        ScheduleOrgUnit.objects.get_or_create(
                            schedule_period=sp,
                            organizational_unit=instance.organizational_unit,
                            defaults={'status': ''}
                        )
        return instance


class ActivityGuidelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityGuideline
        fields = '__all__'


class ActivityOrgUnitSerializer(serializers.ModelSerializer):
    activity_description = serializers.CharField(source='activity.description', read_only=True)
    organizational_unit_name = serializers.CharField(source='organizational_unit.name', read_only=True)

    class Meta:
        model = ActivityOrgUnit
        fields = '__all__'


class ActivityMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityMapping
        fields = '__all__'


class UnfulfilledActivitySerializer(serializers.ModelSerializer):
    registered_by_name = serializers.SerializerMethodField()
    activity_description = serializers.CharField(source='activity.description', read_only=True)

    class Meta:
        model = UnfulfilledActivity
        fields = '__all__'
        read_only_fields = ['registered_by', 'registered_at']

    def get_registered_by_name(self, obj):
        return obj.registered_by.display_name if obj.registered_by else None


class ActivityAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ActivityAttachment
        fields = '__all__'
        read_only_fields = ['uploaded_by', 'uploaded_at']

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.display_name if obj.uploaded_by else None

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None


class ActivityCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.display_name', read_only=True)

    class Meta:
        model = ActivityComment
        fields = '__all__'
        read_only_fields = ['user', 'created_at']
