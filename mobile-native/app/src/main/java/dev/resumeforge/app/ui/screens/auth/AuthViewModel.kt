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

sealed class SessionState {
    object Checking : SessionState()
    object Authenticated : SessionState()
    object Unauthenticated : SessionState()
}

class AuthViewModel(private val repository: AuthRepository = AuthRepository()) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthState>(AuthState.Idle)
    val uiState: StateFlow<AuthState> = _uiState

    private val _sessionState = MutableStateFlow<SessionState>(SessionState.Checking)
    val sessionState: StateFlow<SessionState> = _sessionState

    val currentUser = repository.currentUser

    init {
        // Attempt to restore persisted session immediately on VM creation.
        viewModelScope.launch {
            val restored = repository.restoreSession()
            _sessionState.value = if (restored) SessionState.Authenticated else SessionState.Unauthenticated
        }
    }

    fun login(email: String, pass: String) {
        viewModelScope.launch {
            _uiState.value = AuthState.Loading
            val res = repository.login(LoginRequest(email, pass))
            if (res.isSuccess) {
                _sessionState.value = SessionState.Authenticated
                _uiState.value = AuthState.Success
            } else {
                _uiState.value = AuthState.Error(res.exceptionOrNull()?.message ?: "Login failed")
            }
        }
    }

    fun register(email: String, pass: String, first: String, last: String) {
        viewModelScope.launch {
            _uiState.value = AuthState.Loading
            val res = repository.register(RegisterRequest(email, pass, first, last))
            if (res.isSuccess) {
                _sessionState.value = SessionState.Authenticated
                _uiState.value = AuthState.Success
            } else {
                _uiState.value = AuthState.Error(res.exceptionOrNull()?.message ?: "Registration failed")
            }
        }
    }

    fun resetState() {
        _uiState.value = AuthState.Idle
    }

    fun logout() {
        repository.logout()
        _sessionState.value = SessionState.Unauthenticated
    }
}
