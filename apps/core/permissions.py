from rest_framework.permissions import IsAuthenticated

ROLE_ADMIN = 'Administrador'
ROLE_DIRECTOR = 'Directivo'
ROLE_APPROVER = 'Aprobador'
ROLE_PLANNER = 'Planificador'
ROLE_EXECUTOR = 'Ejecutor'
ROLE_HIERARCHY = [ROLE_EXECUTOR, ROLE_PLANNER, ROLE_APPROVER, ROLE_DIRECTOR]


def has_role(user, role_name):
    if user.is_staff:
        return True
    return user.roles.filter(name=role_name).exists()


def has_any_role(user, role_names):
    if user.is_staff:
        return True
    return user.roles.filter(name__in=role_names).exists()


def get_highest_role(user):
    if user.is_staff:
        return ROLE_ADMIN
    role_names = list(user.roles.values_list('name', flat=True))
    for role in reversed(ROLE_HIERARCHY):
        if role in role_names:
            return role
    return None


class IsAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_staff


class IsAdminOrDirector(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_staff:
            return True
        return has_any_role(request.user, [ROLE_DIRECTOR])


class HasRole(IsAuthenticated):
    def __init__(self, *roles):
        self.roles = roles

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_staff:
            return True
        if not self.roles:
            return False
        return request.user.roles.filter(name__in=self.roles).exists()


class IsDirector(HasRole):
    def __init__(self):
        super().__init__(ROLE_DIRECTOR)


class IsApprover(HasRole):
    def __init__(self):
        super().__init__(ROLE_APPROVER)


class IsPlanner(HasRole):
    def __init__(self):
        super().__init__(ROLE_PLANNER)


class IsExecutor(HasRole):
    def __init__(self):
        super().__init__(ROLE_EXECUTOR)



