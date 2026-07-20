from rest_framework import serializers
from .models import SchedulePeriod, SchedulePeriodMapping, ScheduleOrgUnit, WorkDay, ApprovedPlan, ScheduleComment


class SchedulePeriodSerializer(serializers.ModelSerializer):
    activity_description = serializers.CharField(source='activity.description', read_only=True)

    class Meta:
        model = SchedulePeriod
        fields = '__all__'

    def validate(self, attrs):
        extraplan = attrs.get('is_extraplan')
        if extraplan:
            attrs['status'] = 'CUMPLIDO'
        sd = attrs.get('start_date')
        ed = attrs.get('end_date')
        if sd and ed and sd > ed:
            raise serializers.ValidationError({'end_date': 'La fecha fin no puede ser anterior a la fecha inicio'})
        st = attrs.get('start_time')
        et = attrs.get('end_time')
        if st and et and st >= et:
            raise serializers.ValidationError({'end_time': 'La hora fin debe ser posterior a la hora inicio'})
        return attrs


class SchedulePeriodMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchedulePeriodMapping
        fields = '__all__'


class ScheduleOrgUnitSerializer(serializers.ModelSerializer):
    organizational_unit_name = serializers.CharField(source='organizational_unit.name', read_only=True)

    class Meta:
        model = ScheduleOrgUnit
        fields = '__all__'


class WorkDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkDay
        fields = '__all__'


class ApprovedPlanSerializer(serializers.ModelSerializer):
    org_unit_name = serializers.CharField(source='organizational_unit.name', read_only=True)
    activity_name = serializers.CharField(source='activity.description', read_only=True)
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ApprovedPlan
        fields = '__all__'

    def get_approved_by_name(self, obj):
        return obj.approved_by.display_name if obj.approved_by else None


class ScheduleCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.display_name', read_only=True)

    class Meta:
        model = ScheduleComment
        fields = '__all__'
        read_only_fields = ['user', 'created_at']
