from django.urls import path

from . import dashboard, views

urlpatterns = [
    path('dashboard/', dashboard.dashboard),
    path('groups/', views.groups),
    path('groups/join/', views.join),
    path('groups/<int:group_id>/', views.group_detail),
    path('groups/<int:group_id>/draw/', views.draw),
    path('groups/<int:group_id>/members/<int:user_id>/', views.remove_member),
]
