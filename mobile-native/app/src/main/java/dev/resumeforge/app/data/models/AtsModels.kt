package dev.resumeforge.app.data.models

import com.google.gson.annotations.SerializedName

data class AtsAnalyzeRequest(
    val resumeId: Int,
    val jobDescription: String? = null
)

data class AtsReport(
    val id: String,
    @SerializedName("resume_id") val resumeId: Int,
    @SerializedName("overall_score") val score: Int,
    @SerializedName("matched_keywords")  val matchedKeywords: List<String> = emptyList(),
    @SerializedName("missing_keywords")  val missingKeywords: List<String> = emptyList(),
    val recommendations: List<String> = emptyList(),
    @SerializedName("created_at") val createdAt: String
)
