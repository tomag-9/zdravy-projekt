import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestUserProfile:
    """Tests for user profile management"""
    
    def test_get_profile_authenticated(self, authenticated_client, user):
        """Authenticated user can get their profile"""
        url = reverse('user-profile')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == user.username
        assert 'email' in response.data
        assert 'first_name' in response.data
        assert 'last_name' in response.data
        assert 'date_joined' in response.data
        assert 'groups' in response.data

    def test_get_profile_unauthenticated(self, api_client):
        """Unauthenticated user cannot get profile"""
        url = reverse('user-profile')
        response = api_client.get(url)
        
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_update_profile_first_name(self, authenticated_client, user):
        """User can update their first name"""
        url = reverse('user-profile')
        data = {'first_name': 'Nové'}
        
        response = authenticated_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['first_name'] == 'Nové'
        
        # Verify in database
        user.refresh_from_db()
        assert user.first_name == 'Nové'

    def test_update_profile_last_name(self, authenticated_client, user):
        """User can update their last name"""
        url = reverse('user-profile')
        data = {'last_name': 'Priezvisko'}
        
        response = authenticated_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['last_name'] == 'Priezvisko'

    def test_update_profile_email(self, authenticated_client, user):
        """User can update their email"""
        url = reverse('user-profile')
        data = {'email': 'novy@email.sk'}
        
        response = authenticated_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == 'novy@email.sk'

    def test_update_profile_multiple_fields(self, authenticated_client, user):
        """User can update multiple fields at once"""
        url = reverse('user-profile')
        data = {
            'first_name': 'Ján',
            'last_name': 'Novák',
            'email': 'jan.novak@email.sk'
        }
        
        response = authenticated_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['first_name'] == 'Ján'
        assert response.data['last_name'] == 'Novák'
        assert response.data['email'] == 'jan.novak@email.sk'

    def test_cannot_update_username(self, authenticated_client, user):
        """User cannot change their username (read-only field)"""
        url = reverse('user-profile')
        original_username = user.username
        data = {'username': 'newusername'}
        
        response = authenticated_client.patch(url, data, format='json')
        
        # Should succeed but username should not change
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == original_username
        
        user.refresh_from_db()
        assert user.username == original_username

    def test_profile_shows_user_groups(self, authenticated_client, user, db):
        """Profile shows user's groups"""
        from django.contrib.auth.models import Group
        
        # Create and assign a group
        group = Group.objects.create(name='client')
        user.groups.add(group)
        
        url = reverse('user-profile')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'client' in response.data['groups']
