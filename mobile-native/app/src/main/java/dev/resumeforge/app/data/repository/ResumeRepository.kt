package dev.resumeforge.app.data.repository

import dev.resumeforge.app.data.api.RetrofitClient
import dev.resumeforge.app.data.models.CreateResumeRequest
import dev.resumeforge.app.data.models.Resume

class ResumeRepository {
    private val api = RetrofitClient.apiService

    suspend fun getResumes(): Result<List<Resume>> {
        return try {
            val res = api.getResumes()
            when {
                res.isSuccessful -> Result.success(res.body() ?: emptyList())
                res.code() == 401 -> Result.failure(Exception("401: Session expired"))
                else -> Result.failure(Exception("Failed to load resumes (${res.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createResume(req: CreateResumeRequest): Result<Resume> {
        return try {
            val res = api.createResume(req)
            if (res.isSuccessful && res.body() != null) Result.success(res.body()!!)
            else Result.failure(Exception("Failed to save resume"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
