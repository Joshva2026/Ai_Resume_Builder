package dev.resumeforge.app.ui.screens.ats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.resumeforge.app.data.models.AtsReport
import dev.resumeforge.app.data.models.Resume
import dev.resumeforge.app.data.repository.AtsRepository
import dev.resumeforge.app.data.repository.ResumeRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody

sealed class AtsState {
    object Idle : AtsState()
    data class Analyzing(val message: String) : AtsState()
    data class Success(val report: AtsReport) : AtsState()
    data class Error(val message: String) : AtsState()
}

class AtsViewModel(
    private val repo: AtsRepository = AtsRepository(),
    private val resumeRepo: ResumeRepository = ResumeRepository()
) : ViewModel() {
    private val _uiState = MutableStateFlow<AtsState>(AtsState.Idle)
    val uiState: StateFlow<AtsState> = _uiState

    private val _resumes = MutableStateFlow<List<Resume>>(emptyList())
    val resumes: StateFlow<List<Resume>> = _resumes

    private val _history = MutableStateFlow<List<AtsReport>>(emptyList())
    val history: StateFlow<List<AtsReport>> = _history

    private val _selectedResumeId = MutableStateFlow<Int?>(null)
    val selectedResumeId: StateFlow<Int?> = _selectedResumeId

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            val res = resumeRepo.getResumes()
            if (res.isSuccess) {
                _resumes.value = res.getOrDefault(emptyList())
            }
            val hist = repo.getHistory()
            if (hist.isSuccess) {
                _history.value = hist.getOrDefault(emptyList())
            }
        }
    }

    fun selectResume(id: Int) {
        _selectedResumeId.value = id
        _uiState.value = AtsState.Idle
    }

    fun analyze() {
        val id = _selectedResumeId.value ?: return
        viewModelScope.launch {
            _uiState.value = AtsState.Analyzing("Reading resume...")
            delay(800)
            _uiState.value = AtsState.Analyzing("Checking keywords...")
            delay(800)
            _uiState.value = AtsState.Analyzing("Evaluating skills...")
            
            val res = repo.analyze(id, null)
            if (res.isSuccess) {
                _uiState.value = AtsState.Success(res.getOrThrow())
                // Refresh history
                val hist = repo.getHistory()
                if (hist.isSuccess) {
                    _history.value = hist.getOrDefault(emptyList())
                }
            } else {
                _uiState.value = AtsState.Error(res.exceptionOrNull()?.message ?: "Analysis failed")
            }
        }
    }

    fun analyzeJobMatch(jobDesc: String) {
        val id = _selectedResumeId.value ?: return
        viewModelScope.launch {
            _uiState.value = AtsState.Analyzing("Reading resume...")
            delay(800)
            _uiState.value = AtsState.Analyzing("Analyzing job description...")
            delay(800)
            _uiState.value = AtsState.Analyzing("Calculating match score...")
            
            val res = repo.analyze(id, jobDesc)
            if (res.isSuccess) {
                _uiState.value = AtsState.Success(res.getOrThrow())
                val hist = repo.getHistory()
                if (hist.isSuccess) {
                    _history.value = hist.getOrDefault(emptyList())
                }
            } else {
                _uiState.value = AtsState.Error(res.exceptionOrNull()?.message ?: "Match failed")
            }
        }
    }
    fun analyzeUpload(context: android.content.Context, uri: android.net.Uri) {
        viewModelScope.launch {
            _uiState.value = AtsState.Analyzing("Uploading PDF...")
            try {
                val inputStream = context.contentResolver.openInputStream(uri)
                if (inputStream == null) {
                    _uiState.value = AtsState.Error("Failed to read file")
                    return@launch
                }
                val bytes = inputStream.readBytes()
                inputStream.close()
                val mediaType = "application/pdf".toMediaTypeOrNull()
                val requestBody = bytes.toRequestBody(mediaType)
                val filePart = okhttp3.MultipartBody.Part.createFormData("resume", "upload.pdf", requestBody)
                
                _uiState.value = AtsState.Analyzing("Analyzing PDF...")
                val res = repo.analyzeUpload(filePart)
                if (res.isSuccess) {
                    _uiState.value = AtsState.Success(res.getOrThrow())
                    val hist = repo.getHistory()
                    if (hist.isSuccess) {
                        _history.value = hist.getOrDefault(emptyList())
                    }
                } else {
                    _uiState.value = AtsState.Error(res.exceptionOrNull()?.message ?: "PDF Analysis failed")
                }
            } catch (e: Exception) {
                _uiState.value = AtsState.Error(e.message ?: "Failed to read file")
            }
        }
    }
}
