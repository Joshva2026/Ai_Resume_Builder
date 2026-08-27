package dev.resumeforge.app.data.models

data class User(
    val id: Int,
    val email: String,
    val first_name: String?,
    val last_name: String?
)

data class LoginRequest(val email: String, val password: String)
data class RegisterRequest(val email: String, val password: String, val firstName: String?, val lastName: String?)

data class AuthResponse(
    val message: String?,
    val token: String,
    val refreshToken: String?,
    val user: User
)

data class GenericResponse(val message: String?, val error: String?)
