package dev.resumeforge.app.data.repository

import dev.resumeforge.app.data.api.RetrofitClient
import dev.resumeforge.app.data.models.AtsAnalyzeRequest
import dev.resumeforge.app.data.models.AtsReport

class AtsRepository {
    private val api = RetrofitClient.apiService

    suspend fun analyze(resumeId: Int, jobDesc: String?): Result<AtsReport> {
        return try {
            val res = api.analyzeAts(AtsAnalyzeRequest(resumeId, jobDesc))
            if (res.isSuccessful && res.body() != null) Result.success(res.body()!!)
            else Result.failure(Exception("Failed to analyze resume"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
