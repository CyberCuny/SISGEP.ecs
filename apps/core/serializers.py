from rest_framework import serializers
from .models import (User, Role, UserRole, OrganizationalUnit, Category,
                     ActivityType, ARC, WorkObjective, MeasurementCriterion, Guideline,
                     ObjectPermission, EmailConfig, SystemConfig)


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    plan_approver_name = serializers.CharField(source='plan_approver.display_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'display_name', 'email', 'position', 'is_disabled',
                  'date_last_login', 'time_last_login', 'plan_approver', 'plan_approver_name',
                  'roles', 'is_active', 'is_staff', 'is_superuser']
        read_only_fields = ['date_last_login', 'time_last_login']

    def get_roles(self, obj):
        return [{'id': ur.role.id, 'name': ur.role.name} for ur in obj.userrole_set.all()]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'display_name', 'email', 'password', 'position', 'plan_approver']

    def create(self, validated_data):
        password = validated_data.pop('password')
        if not validated_data.get('display_name'):
            validated_data['display_name'] = validated_data['username']
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = '__all__'


class OrganizationalUnitSerializer(serializers.ModelSerializer):
    responsible_name = serializers.CharField(source='responsible.display_name', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)

    class Meta:
        model = OrganizationalUnit
        fields = '__all__'


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class ActivityTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityType
        fields = '__all__'


class ARCSerializer(serializers.ModelSerializer):
    class Meta:
        model = ARC
        fields = '__all__'


class WorkObjectiveSerializer(serializers.ModelSerializer):
    arc_name = serializers.CharField(source='arc.name', read_only=True)

    class Meta:
        model = WorkObjective
        fields = '__all__'


class MeasurementCriterionSerializer(serializers.ModelSerializer):
    objective_name = serializers.CharField(source='objective.name', read_only=True)

    class Meta:
        model = MeasurementCriterion
        fields = '__all__'


class GuidelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guideline
        fields = '__all__'


class ObjectPermissionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.display_name', read_only=True)
    granted_by_name = serializers.CharField(source='granted_by.display_name', read_only=True)

    class Meta:
        model = ObjectPermission
        fields = '__all__'
        read_only_fields = ['granted_by', 'created_at']


class EmailConfigSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = EmailConfig
        fields = ['id', 'host', 'port', 'use_tls', 'use_ssl', 'username', 'password', 'default_from']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['password'] = '********' if instance.password else ''
        return ret


class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfig
        fields = '__all__'
