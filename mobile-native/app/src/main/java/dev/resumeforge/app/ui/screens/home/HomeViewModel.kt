package dev.resumeforge.app.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.resumeforge.app.data.models.AtsReport
import dev.resumeforge.app.data.models.Resume
import dev.resumeforge.app.data.models.User
import dev.resumeforge.app.data.repository.AtsRepository
import dev.resumeforge.app.data.repository.ResumeRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Aggregated data shown on the Home dashboard.
 *
 * [latestAtsScore] reflects the most recent ATS analysis from /api/ats/history,
 * mapped through [AtsReport.score] (backend field: overall_score).
 * If no ATS analysis exists yet, the value is null and the UI shows "— / 100".
 * No score is fabricated.
 */
data class HomeDashboardData(
    val user: User,
    val resumes: List<Resume>,
    val latestAtsScore: Int?        // null when no ATS history exists
)

sealed class HomeUiState {
    object Loading : HomeUiState()
    data class Success(val data: HomeDashboardData) : HomeUiState()
    data class Error(val message: String) : HomeUiState()
    /** Returned when session expires mid-load (401 from a protected endpoint). */
    object SessionExpired : HomeUiState()
}

class HomeViewModel(
    private val resumeRepo: ResumeRepository = ResumeRepository(),
    private val atsRepo: AtsRepository = AtsRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState

    /**
     * Load all dashboard data concurrently.
     * [user] is injected from [AuthViewModel.currentUser] which is already populated
     * after login or session restore.
     */
    fun loadDashboard(user: User) {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading

            // Fetch resumes and ATS history in parallel.
            val resumesDeferred = async { resumeRepo.getResumes() }
            val atsDeferred     = async { atsRepo.getHistory() }

            val resumesResult = resumesDeferred.await()
            val atsResult     = atsDeferred.await()

            // 401 from either endpoint signals session expiry.
            if (resumesResult.isFailure && resumesResult.exceptionOrNull()?.message?.contains("401") == true) {
                _uiState.value = HomeUiState.SessionExpired
                return@launch
            }

            val resumes = resumesResult.getOrDefault(emptyList())

            // Derive career strength from the most recent ATS score.
            // If no reports exist yet, latestAtsScore stays null → UI shows "— / 100".
            val latestAtsScore = atsResult.getOrNull()
                ?.maxByOrNull { it.createdAt }
                ?.score

            _uiState.value = HomeUiState.Success(
                HomeDashboardData(
                    user = user,
                    resumes = resumes,
                    latestAtsScore = latestAtsScore
                )
            )
        }
    }

    /** Retry after an error. Requires the user to be re-supplied. */
    fun retry(user: User) = loadDashboard(user)
}
