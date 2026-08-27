package dev.resumeforge.app.data.models

data class AtsAnalyzeRequest(
    val resumeId: Int,
    val jobDescription: String? = null
)

data class AtsReport(
    val id: String,
    val score: Int,
    val matchedKeywords: List<String> = emptyList(),
    val missingKeywords: List<String> = emptyList(),
    val recommendations: List<String> = emptyList(),
    val createdAt: String
)
