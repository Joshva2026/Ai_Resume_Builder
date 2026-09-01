package dev.resumeforge.app.data.models

import com.google.gson.annotations.SerializedName

/**
 * Represents an authenticated ResumeForge user.
 * Field names use @SerializedName to match the backend camelCase JSON contract.
 */
data class User(
    val id: Int,
    val email: String,
    @SerializedName("firstName")  val firstName: String?,
    @SerializedName("lastName")   val lastName: String?
)

/**
 * Wrapper for /api/auth/me which returns { "user": { ... } }.
 */
data class MeResponse(val user: User)

data class LoginRequest(val email: String, val password: String)
data class RegisterRequest(val email: String, val password: String, val firstName: String?, val lastName: String?)
data class UpdateProfileRequest(
    val email: String?, 
    val firstName: String?, 
    val lastName: String?,
    val phone: String? = null,
    val location: String? = null,
    val bio: String? = null,
    val profileImageUrl: String? = null,
    val linkedinUrl: String? = null,
    val portfolioUrl: String? = null,
    val githubUrl: String? = null
)

/**
 * Backend login/register response.
 * Token field is "accessToken" in the JSON payload, not "token".
 */
data class AuthResponse(
    val message: String?,
    @SerializedName("accessToken")  val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String?,
    val user: User
)

data class GenericResponse(val message: String?, val error: String?)
