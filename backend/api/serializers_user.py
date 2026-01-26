from django.contrib.auth.models import User
from rest_framework import serializers


class UserProfileSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "date_joined",
            "groups",
        ]
        read_only_fields = ["id", "username", "date_joined"]

    def get_groups(self, obj):
        return [group.name for group in obj.groups.all()]
