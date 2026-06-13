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
    class Meta:
        model = ApprovedPlan
        fields = '__all__'


class ScheduleCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.display_name', read_only=True)

    class Meta:
        model = ScheduleComment
        fields = '__all__'
        read_only_fields = ['user', 'created_at']
