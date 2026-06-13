from rest_framework import serializers
from .models import Activity, ActivityGuideline, ActivityOrgUnit, ActivityMapping, UnfulfilledActivity, ActivityAttachment, ActivityComment


class ActivitySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    organizational_unit_name = serializers.CharField(source='organizational_unit.name', read_only=True)
    arc_name = serializers.CharField(source='arc.name', read_only=True)
    activity_type_name = serializers.CharField(source='activity_type.name', read_only=True)
    associated_objective_name = serializers.CharField(source='associated_objective.name', read_only=True)
    measurement_criterion_name = serializers.CharField(source='measurement_criterion.name', read_only=True)
    guideline_ids = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = '__all__'

    def get_guideline_ids(self, obj):
        return list(obj.activityguideline_set.values_list('guideline_id', flat=True))


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
    registered_by_name = serializers.CharField(source='registered_by.display_name', read_only=True)
    activity_description = serializers.CharField(source='activity.description', read_only=True)

    class Meta:
        model = UnfulfilledActivity
        fields = '__all__'
        read_only_fields = ['registered_by', 'registered_at']


class ActivityAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.display_name', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ActivityAttachment
        fields = '__all__'
        read_only_fields = ['uploaded_by', 'uploaded_at']

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
