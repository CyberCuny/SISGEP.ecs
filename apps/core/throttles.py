from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class WriteThrottle(UserRateThrottle):
    scope = 'write'

    def allow_request(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return super().allow_request(request, view)


class AuthThrottle(AnonRateThrottle):
    scope = 'auth'


class ReportThrottle(UserRateThrottle):
    scope = 'report'
