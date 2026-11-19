from django.urls import path

from . import views

urlpatterns = [
    path('signup/', views.signup),
    path('login/', views.login),
    path('logout/', views.logout),
    path('me/', views.me),
    path('me/dismiss-phone-prompt/', views.dismiss_phone_prompt),
]
