package dev.resumeforge.app.data.repository

import dev.resumeforge.app.data.api.RetrofitClient
import dev.resumeforge.app.data.models.AiChatRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import java.io.BufferedReader

class AiRepository {
    private val api = RetrofitClient.apiService

    fun streamChatResponse(request: AiChatRequest): Flow<String> = flow {
        val response = api.streamChat(request)
        if (response.isSuccessful) {
            val body = response.body() ?: return@flow
            body.byteStream().bufferedReader().use { reader ->
                var line = reader.readLine()
                while (line != null) {
                    if (line.startsWith("data: ")) {
                        val data = line.removePrefix("data: ")
                        if (data != "[DONE]") {
                            try {
                                val json = org.json.JSONObject(data)
                                if (json.has("text")) {
                                    emit(json.getString("text"))
                                } else if (json.has("error")) {
                                    throw Exception(json.getString("error"))
                                }
                            } catch (e: org.json.JSONException) {
                                emit(data)
                            }
                        }
                    }
                    line = reader.readLine()
                }
            }
        } else {
            throw Exception("Failed to connect to AI service: ${response.code()}")
        }
    }.flowOn(Dispatchers.IO)
}
