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
            else Result.failure(Exception("Failed to analyze resume (${res.code()})"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /** Fetches the most recent ATS reports for the authenticated user. */
    suspend fun getHistory(): Result<List<AtsReport>> {
        return try {
            val res = api.getAtsHistory()
            when {
                res.isSuccessful -> Result.success(res.body() ?: emptyList())
                res.code() == 401 -> Result.failure(Exception("401: Session expired"))
                else -> Result.failure(Exception("Failed to load ATS history (${res.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
