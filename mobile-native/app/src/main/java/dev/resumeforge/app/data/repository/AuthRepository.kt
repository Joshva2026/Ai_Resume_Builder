package dev.resumeforge.app.data.repository

import dev.resumeforge.app.data.api.RetrofitClient
import dev.resumeforge.app.data.models.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class AuthRepository {
    private val api = RetrofitClient.apiService

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser

    /** True when a non-blank access token is available (persisted or runtime). */
    val hasStoredSession: Boolean
        get() = RetrofitClient.currentToken?.isNotBlank() == true

    /** Login with email/password. Returns success only when accessToken is non-blank. */
    suspend fun login(req: LoginRequest): Result<AuthResponse> {
        return try {
            val response = api.login(req)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.accessToken.isBlank()) {
                    return Result.failure(Exception("Server returned an empty token — login rejected"))
                }
                RetrofitClient.setAuthToken(body.accessToken)
                RetrofitClient.setRefreshToken(body.refreshToken)
                _currentUser.value = body.user
                Result.success(body)
            } else {
                val code = response.code()
                val msg = when (code) {
                    401 -> "Invalid email or password"
                    else -> "Login failed ($code)"
                }
                Result.failure(Exception(msg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /** Register a new account. Token handling mirrors login. */
    suspend fun register(req: RegisterRequest): Result<AuthResponse> {
        return try {
            val response = api.register(req)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.accessToken.isBlank()) {
                    return Result.failure(Exception("Server returned an empty token — registration rejected"))
                }
                RetrofitClient.setAuthToken(body.accessToken)
                RetrofitClient.setRefreshToken(body.refreshToken)
                _currentUser.value = body.user
                Result.success(body)
            } else {
                Result.failure(Exception("Registration failed (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Update user profile.
     */
    suspend fun updateProfile(req: UpdateProfileRequest): Result<MeResponse> {
        return try {
            val response = api.updateProfile(req)
            if (response.isSuccessful && response.body() != null) {
                _currentUser.value = response.body()!!.user
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to update profile (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Attempt to restore an existing session from the persisted token.
     * Calls /api/auth/me to verify the token is still valid and populate currentUser.
     * Returns true if the session was successfully restored.
     */
    suspend fun restoreSession(): Boolean {
        RetrofitClient.restoreSession()
        if (!hasStoredSession) return false
        return try {
            val response = api.getMe()
            when {
                response.isSuccessful && response.body() != null -> {
                    _currentUser.value = response.body()!!.user
                    true
                }
                response.code() == 401 -> {
                    // Token is expired / revoked — force logout
                    clearSession()
                    false
                }
                else -> false
            }
        } catch (e: Exception) {
            // Network unavailable — keep stored token but signal failure
            false
        }
    }

    /** Clear all auth state — token, user, persistent storage. */
    fun logout() {
        clearSession()
    }

    private fun clearSession() {
        RetrofitClient.clearTokens()
        _currentUser.value = null
    }
}
