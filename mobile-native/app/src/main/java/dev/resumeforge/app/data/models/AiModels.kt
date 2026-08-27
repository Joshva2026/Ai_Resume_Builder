package dev.resumeforge.app.data.models

data class AiChatRequest(
    val message: String,
    val conversation: List<AiMessagePayload>,
    val resumeContext: String? = null,
    val resumeId: Int? = null,
    val stream: Boolean = true
)

data class AiMessagePayload(
    val role: String,
    val content: String
)

data class ChatMessage(
    val id: String,
    val role: String,
    val text: String,
    val isStreaming: Boolean = false,
    val isError: Boolean = false
)
