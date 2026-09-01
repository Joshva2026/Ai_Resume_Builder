package dev.resumeforge.app.ui.screens.resume

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Description
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import dev.resumeforge.app.data.models.Resume
import dev.resumeforge.app.data.repository.ResumeRepository
import dev.resumeforge.app.ui.screens.auth.AuthViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

// ── Design tokens ─────────────────────────────────────────────────────────────
private val BgDeep    = Color(0xFF0F172A)
private val BgSurface = Color(0xFF1E293B)
private val BgCard    = Color(0xFF1E293B)
private val Accent    = Color(0xFF10B981)
private val AccentDim = Color(0xFF10B981).copy(alpha = 0.12f)
private val TextPrime = Color.White
private val TextSub   = Color(0xFF94A3B8)
private val Danger    = Color(0xFFEF4444)
private val DangerDim = Color(0xFF2D1518)
private val Border    = Color(0xFF334155)

// ── ViewModel ─────────────────────────────────────────────────────────────────
sealed class ResumeListState {
    object Loading : ResumeListState()
    data class Success(val resumes: List<Resume>) : ResumeListState()
    data class Error(val message: String) : ResumeListState()
}

class ResumeListViewModel(private val repo: ResumeRepository = ResumeRepository()) : ViewModel() {
    private val _state = MutableStateFlow<ResumeListState>(ResumeListState.Loading)
    val state: StateFlow<ResumeListState> = _state

    private val _deleting = MutableStateFlow<Int?>(null)
    val deleting: StateFlow<Int?> = _deleting

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = ResumeListState.Loading
            val result = repo.getResumes()
            _state.value = if (result.isSuccess) {
                ResumeListState.Success(result.getOrDefault(emptyList()))
            } else {
                ResumeListState.Error(result.exceptionOrNull()?.message ?: "Failed to load resumes")
            }
        }
    }

    fun deleteResume(id: Int) {
        viewModelScope.launch {
            _deleting.value = id
            repo.deleteResume(id)
            _deleting.value = null
            load()
        }
    }
}

// ── Screen ────────────────────────────────────────────────────────────────────
@Composable
fun ResumeListScreen(
    authViewModel: AuthViewModel,
    onCreateClick: () -> Unit,
    onAnalyzeClick: () -> Unit = {},
    vm: ResumeListViewModel = viewModel()
) {
    val state    by vm.state.collectAsState()
    val deleting by vm.deleting.collectAsState()

    Box(Modifier.fillMaxSize().background(BgDeep)) {
        Column(Modifier.fillMaxSize()) {
            Surface(color = BgDeep, tonalElevation = 0.dp) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 24.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("My Resumes", color = TextPrime, fontWeight = FontWeight.Bold, fontSize = 24.sp)
                        Spacer(Modifier.height(4.dp))
                        Text("Manage and edit your resumes", color = TextSub, fontSize = 14.sp)
                    }
                    FloatingActionButton(
                        onClick = onCreateClick,
                        containerColor = Accent,
                        contentColor = Color(0xFF0F172A),
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "New Resume")
                    }
                }
            }
            HorizontalDivider(color = Border, thickness = 1.dp)

            when (val s = state) {
                is ResumeListState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
                is ResumeListState.Error -> Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Could not load resumes", color = Danger, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(8.dp))
                        Text(
                            if (s.message.contains("401")) "Session expired. Please log in again."
                            else "Check your connection and try again.",
                            color = TextSub, fontSize = 14.sp, textAlign = TextAlign.Center
                        )
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = { vm.load() }, colors = ButtonDefaults.buttonColors(containerColor = Accent), shape = RoundedCornerShape(12.dp)) {
                            Text("Retry", color = Color(0xFF0F172A), fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
                is ResumeListState.Success -> if (s.resumes.isEmpty()) {
                    EmptyResumesView(onCreateClick)
                } else {
                    LazyColumn(contentPadding = PaddingValues(horizontal = 24.dp, vertical = 24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        items(s.resumes, key = { it.id }) { resume ->
                            ResumeCard(
                                resume = resume,
                                deleting = deleting == resume.id,
                                onEdit = onCreateClick,
                                onAnalyze = onAnalyzeClick,
                                onDelete = { vm.deleteResume(resume.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ResumeCard(resume: Resume, deleting: Boolean, onEdit: () -> Unit, onAnalyze: () -> Unit, onDelete: () -> Unit) {
    var showDeleteConfirm by remember { mutableStateOf(false) }
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(resume.title, color = TextPrime, fontWeight = FontWeight.SemiBold, fontSize = 18.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Spacer(Modifier.height(4.dp))
                    Text("Modified recently", color = TextSub, fontSize = 13.sp)
                }
                if (resume.ats_score != null) {
                    Surface(color = AccentDim, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Accent)) {
                        Text("${resume.ats_score} ATS", color = Accent, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
                    }
                }
            }
            
            Spacer(Modifier.height(20.dp))
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(
                    onClick = onEdit,
                    modifier = Modifier.weight(1f).height(44.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F172A)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Edit", color = TextPrime, fontWeight = FontWeight.SemiBold)
                }
                Button(
                    onClick = onAnalyze,
                    modifier = Modifier.weight(1f).height(44.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F172A)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Analyze", color = TextPrime, fontWeight = FontWeight.SemiBold)
                }
            }

            Spacer(Modifier.height(16.dp))
            HorizontalDivider(color = Border, thickness = 1.dp)
            Spacer(Modifier.height(12.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                if (!showDeleteConfirm) {
                    TextButton(onClick = { showDeleteConfirm = true }, colors = ButtonDefaults.textButtonColors(contentColor = Danger)) {
                        if (deleting) CircularProgressIndicator(Modifier.size(16.dp), color = Danger, strokeWidth = 2.dp)
                        else Text("Delete Resume", fontSize = 14.sp)
                    }
                } else {
                    Surface(color = DangerDim, shape = RoundedCornerShape(8.dp)) {
                        Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("Delete?", color = Danger, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                            TextButton(onClick = { showDeleteConfirm = false }) { Text("Cancel", fontSize = 13.sp, color = TextSub) }
                            TextButton(onClick = { showDeleteConfirm = false; onDelete() }) { Text("Yes", fontSize = 13.sp, color = Danger) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyResumesView(onCreate: () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(Modifier.padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Description, null, tint = TextSub, modifier = Modifier.size(64.dp))
            Spacer(Modifier.height(16.dp))
            Text("No Resumes Yet", color = TextPrime, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Spacer(Modifier.height(8.dp))
            Text("Create your first resume to start applying with confidence.", color = TextSub, fontSize = 15.sp, textAlign = TextAlign.Center)
            Spacer(Modifier.height(32.dp))
            Button(onClick = onCreate, modifier = Modifier.height(56.dp), colors = ButtonDefaults.buttonColors(containerColor = Accent), shape = RoundedCornerShape(12.dp)) {
                Icon(Icons.Default.Add, null, tint = Color(0xFF0F172A))
                Spacer(Modifier.width(8.dp))
                Text("Create Resume", color = Color(0xFF0F172A), fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        }
    }
}
