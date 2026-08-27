package dev.resumeforge.app.ui.screens.ats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.resumeforge.app.data.models.AtsReport
import dev.resumeforge.app.data.repository.AtsRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class AtsState {
    object Idle : AtsState()
    data class Analyzing(val message: String) : AtsState()
    data class Success(val report: AtsReport) : AtsState()
    data class Error(val message: String) : AtsState()
}

class AtsViewModel(private val repo: AtsRepository = AtsRepository()) : ViewModel() {
    private val _uiState = MutableStateFlow<AtsState>(AtsState.Idle)
    val uiState: StateFlow<AtsState> = _uiState

    fun analyzeResume(resumeId: Int, jobDescription: String? = null) {
        viewModelScope.launch {
            _uiState.value = AtsState.Analyzing("Reading resume...")
            delay(800)
            _uiState.value = AtsState.Analyzing("Checking keywords...")
            delay(800)
            _uiState.value = AtsState.Analyzing("Evaluating skills...")
            
            val res = repo.analyze(resumeId, jobDescription)
            if (res.isSuccess) _uiState.value = AtsState.Success(res.getOrThrow())
            else _uiState.value = AtsState.Error(res.exceptionOrNull()?.message ?: "Analysis failed")
        }
    }
}
