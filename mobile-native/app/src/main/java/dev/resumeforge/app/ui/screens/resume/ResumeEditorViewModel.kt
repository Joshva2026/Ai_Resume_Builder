package dev.resumeforge.app.ui.screens.resume

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.resumeforge.app.data.models.CreateResumeRequest
import dev.resumeforge.app.data.models.ResumeContent
import dev.resumeforge.app.data.repository.ResumeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class SaveState {
    object Idle : SaveState()
    object Saving : SaveState()
    object Success : SaveState()
    data class Error(val message: String) : SaveState()
}

class ResumeEditorViewModel(private val repo: ResumeRepository = ResumeRepository()) : ViewModel() {
    private val _content = MutableStateFlow(ResumeContent())
    val content: StateFlow<ResumeContent> = _content

    private val _saveState = MutableStateFlow<SaveState>(SaveState.Idle)
    val saveState: StateFlow<SaveState> = _saveState

    var currentStep = MutableStateFlow(1)
    
    // Auto-save is disabled by requirement. This is the single explicit save endpoint.
    fun saveResume(title: String, templateId: String) {
        viewModelScope.launch {
            _saveState.value = SaveState.Saving
            
            // Basic validation
            val curr = _content.value
            if (curr.personal.firstName.isBlank() || curr.personal.email.isBlank()) {
                _saveState.value = SaveState.Error("Required fields missing (Name, Email)")
                return@launch
            }

            val req = CreateResumeRequest(title, templateId, curr)
            val res = repo.createResume(req)
            if (res.isSuccess) _saveState.value = SaveState.Success
            else _saveState.value = SaveState.Error(res.exceptionOrNull()?.message ?: "Save failed")
        }
    }
}
