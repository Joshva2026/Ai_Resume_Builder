package dev.resumeforge.app.data.api

import dev.resumeforge.app.data.models.*
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Streaming

interface ApiService {

    // ── Auth ──────────────────────────────────────────────────────────────
    @POST("/api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("/api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @GET("/api/auth/me")
    suspend fun getMe(): Response<MeResponse>

    // ── Resumes ───────────────────────────────────────────────────────────
    @GET("/api/resumes")
    suspend fun getResumes(): Response<List<Resume>>

    @POST("/api/resumes")
    suspend fun createResume(@Body request: CreateResumeRequest): Response<Resume>

    @PUT("/api/resumes/{id}")
    suspend fun updateResume(
        @Path("id") id: Int,
        @Body request: CreateResumeRequest
    ): Response<Resume>

    @DELETE("/api/resumes/{id}")
    suspend fun deleteResume(@Path("id") id: Int): Response<GenericMessageResponse>

    // ── PDF ───────────────────────────────────────────────────────────────
    @POST("/api/download/pdf")
    suspend fun downloadPdf(@Body request: CreateResumeRequest): Response<ResponseBody>

    // ── ATS ───────────────────────────────────────────────────────────────
    @POST("/api/ats/analyze")
    suspend fun analyzeAts(@Body request: AtsAnalyzeRequest): Response<AtsReport>

    @GET("/api/ats/history")
    suspend fun getAtsHistory(): Response<List<AtsReport>>

    // ── AI ────────────────────────────────────────────────────────────────
    @POST("/api/ai/chat")
    @Streaming
    suspend fun streamChat(@Body request: AiChatRequest): Response<ResponseBody>
}
