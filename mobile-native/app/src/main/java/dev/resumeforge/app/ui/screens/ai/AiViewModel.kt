package dev.resumeforge.app.ui.screens.ai

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.resumeforge.app.data.models.AiChatRequest
import dev.resumeforge.app.data.models.AiMessagePayload
import dev.resumeforge.app.data.models.ChatMessage
import dev.resumeforge.app.data.repository.AiRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import java.util.UUID

class AiViewModel(private val repo: AiRepository = AiRepository()) : ViewModel() {
    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages
    
    private val _isSending = MutableStateFlow(false)
    val isSending: StateFlow<Boolean> = _isSending

    fun sendMessage(text: String, resumeId: Int?) {
        val userMsg = ChatMessage(UUID.randomUUID().toString(), "user", text)
        _messages.value = _messages.value + userMsg
        
        val aiMsgId = UUID.randomUUID().toString()
        val aiMsg = ChatMessage(aiMsgId, "model", "", isStreaming = true)
        _messages.value = _messages.value + aiMsg
        
        _isSending.value = true
        
        val conversation = _messages.value.filter { !it.isStreaming }.map { 
            AiMessagePayload(it.role, it.text)
        }
        
        viewModelScope.launch {
            repo.streamChatResponse(AiChatRequest(text, conversation, null, resumeId, true))
                .catch { e ->
                    updateAiMessage(aiMsgId, "AI is temporarily busy. Please try again.", false, true)
                    _isSending.value = false
                }
                .collect { chunk ->
                    // In a real implementation we'd parse JSON here if backend sends JSON.
                    // Assuming raw string chunks for this scaffold.
                    appendAiMessage(aiMsgId, chunk)
                }
                
            markAiMessageDone(aiMsgId)
            _isSending.value = false
        }
    }
    
    private fun appendAiMessage(id: String, chunk: String) {
        _messages.value = _messages.value.map {
            if (it.id == id) it.copy(text = it.text + chunk) else it
        }
    }
    
    private fun markAiMessageDone(id: String) {
        _messages.value = _messages.value.map {
            if (it.id == id) it.copy(isStreaming = false) else it
        }
    }
    
    private fun updateAiMessage(id: String, text: String, isStreaming: Boolean, isError: Boolean) {
         _messages.value = _messages.value.map {
            if (it.id == id) it.copy(text = text, isStreaming = isStreaming, isError = isError) else it
        }
    }
}
