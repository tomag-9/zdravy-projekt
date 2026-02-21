"""
Middleware for API security and caching control.
"""


class NoCacheMiddleware:
    """
    Middleware to prevent caching of API responses.
    This ensures that authenticated endpoints always return fresh data
    and prevents user data leakage across sessions.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Only apply to API endpoints
        if request.path.startswith("/api/"):
            response["Cache-Control"] = "no-cache, no-store, must-revalidate, private"
            response["Pragma"] = "no-cache"
            response["Expires"] = "0"

        return response
