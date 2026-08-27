package dev.resumeforge.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.resumeforge.app.data.models.LoginRequest
import dev.resumeforge.app.data.models.RegisterRequest
import dev.resumeforge.app.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    object Success : AuthState()
    data class Error(val message: String) : AuthState()
}

class AuthViewModel(private val repository: AuthRepository = AuthRepository()) : ViewModel() {
    private val _uiState = MutableStateFlow<AuthState>(AuthState.Idle)
    val uiState: StateFlow<AuthState> = _uiState

    val currentUser = repository.currentUser

    fun login(email: String, pass: String) {
        viewModelScope.launch {
            _uiState.value = AuthState.Loading
            val res = repository.login(LoginRequest(email, pass))
            if (res.isSuccess) _uiState.value = AuthState.Success
            else _uiState.value = AuthState.Error(res.exceptionOrNull()?.message ?: "Login failed")
        }
    }
    
    fun register(email: String, pass: String, first: String, last: String) {
        viewModelScope.launch {
            _uiState.value = AuthState.Loading
            val res = repository.register(RegisterRequest(email, pass, first, last))
            if (res.isSuccess) _uiState.value = AuthState.Success
            else _uiState.value = AuthState.Error(res.exceptionOrNull()?.message ?: "Registration failed")
        }
    }
    
    fun resetState() {
        _uiState.value = AuthState.Idle
    }
    
    fun logout() {
        repository.logout()
    }
}
