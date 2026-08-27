package dev.resumeforge.app.data.repository

import dev.resumeforge.app.data.api.RetrofitClient
import dev.resumeforge.app.data.models.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class AuthRepository {
    private val api = RetrofitClient.apiService
    
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser

    suspend fun login(req: LoginRequest): Result<AuthResponse> {
        return try {
            val response = api.login(req)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                RetrofitClient.authToken = body.token
                _currentUser.value = body.user
                Result.success(body)
            } else {
                Result.failure(Exception("Login failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(req: RegisterRequest): Result<AuthResponse> {
        return try {
            val response = api.register(req)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                RetrofitClient.authToken = body.token
                _currentUser.value = body.user
                Result.success(body)
            } else {
                Result.failure(Exception("Registration failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun logout() {
        RetrofitClient.authToken = null
        _currentUser.value = null
    }
}
