package dev.resumeforge.app.ui.screens.ats

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.resumeforge.app.data.models.AtsReport
import dev.resumeforge.app.ui.screens.auth.AuthViewModel

private val BgDeep    = Color(0xFF0F172A)
private val BgCard    = Color(0xFF1E293B)
private val Accent    = Color(0xFF10B981)
private val TextPrime = Color.White
private val TextSub   = Color(0xFF94A3B8)
private val Border    = Color(0xFF334155)
private val Danger    = Color(0xFFEF4444)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobMatchScreen(
    viewModel: AtsViewModel,
    authViewModel: AuthViewModel,
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val resumes by viewModel.resumes.collectAsState()
    val selectedId by viewModel.selectedResumeId.collectAsState()
    var jobDescription by remember { mutableStateOf("") }

    Scaffold(
        containerColor = BgDeep,
        topBar = {
            Surface(color = BgDeep, tonalElevation = 0.dp) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.ArrowBack, "Back", tint = TextPrime)
                        }
                        Column {
                            Text("Job Match", color = TextPrime, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            Spacer(Modifier.height(4.dp))
                            Text("Compare your resume against a job description", color = TextSub, fontSize = 13.sp)
                        }
                    }
                    HorizontalDivider(color = Border, thickness = 1.dp)
                }
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            when (val state = uiState) {
                is AtsState.Idle -> {
                    Column(modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
                        Text("Select a Resume", color = TextPrime, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                        Spacer(Modifier.height(8.dp))
                        if (resumes.isEmpty()) {
                            Text("No resumes found.", color = TextSub)
                        } else {
                            resumes.forEach { r ->
                                val selected = selectedId == r.id
                                Card(
                                    onClick = { viewModel.selectResume(r.id) },
                                    colors = CardDefaults.cardColors(containerColor = if (selected) Accent.copy(alpha = 0.12f) else BgCard),
                                    shape = RoundedCornerShape(10.dp),
                                    border = if (selected) CardDefaults.outlinedCardBorder() else null,
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                                ) {
                                    Text(
                                        r.title,
                                        color = if (selected) Accent else TextPrime,
                                        modifier = Modifier.padding(16.dp)
                                    )
                                }
                            }
                        }

                        Spacer(Modifier.height(24.dp))
                        Text("Job Description", color = TextPrime, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(
                            value = jobDescription,
                            onValueChange = { jobDescription = it },
                            modifier = Modifier.fillMaxWidth().heightIn(min = 160.dp),
                            placeholder = { Text("Paste the job description here...", color = TextSub.copy(alpha = 0.6f)) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Accent,
                                unfocusedBorderColor = Border,
                                focusedTextColor = TextPrime,
                                unfocusedTextColor = TextPrime,
                                cursorColor = Accent,
                                focusedContainerColor = BgCard,
                                unfocusedContainerColor = BgCard
                            )
                        )

                        Spacer(Modifier.height(24.dp))
                        Button(
                            onClick = { viewModel.analyzeJobMatch(jobDescription) },
                            enabled = selectedId != null && jobDescription.isNotBlank(),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Accent),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Analyze Match", color = BgDeep, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                is AtsState.Analyzing -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        CircularProgressIndicator(color = Accent)
                        Spacer(Modifier.height(16.dp))
                        Text(state.message, color = TextPrime)
                    }
                }
                is AtsState.Error -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(Icons.Default.Warning, contentDescription = "Error", tint = Danger, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(16.dp))
                        Text(state.message, color = Danger, fontWeight = FontWeight.Medium)
                        Spacer(Modifier.height(24.dp))
                        Button(
                            onClick = { viewModel.selectResume(selectedId ?: 0) },
                            colors = ButtonDefaults.buttonColors(containerColor = BgCard)
                        ) {
                            Text("Try Again", color = TextPrime)
                        }
                    }
                }
                is AtsState.Success -> {
                    JobMatchResultView(state.report) {
                        viewModel.selectResume(selectedId ?: 0)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun JobMatchResultView(report: AtsReport, onReset: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = BgCard),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Match Score", color = TextSub, fontSize = 14.sp)
                Spacer(Modifier.height(8.dp))
                Box(contentAlignment = Alignment.Center, modifier = Modifier.size(100.dp)) {
                    CircularProgressIndicator(
                        progress = { report.score / 100f },
                        modifier = Modifier.fillMaxSize(),
                        color = Accent,
                        trackColor = Color(0xFF0F172A),
                        strokeWidth = 6.dp
                    )
                    Text("${report.score}%", color = TextPrime, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(Modifier.height(24.dp))
        Text("Matched Skills", color = TextPrime, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(Modifier.height(12.dp))
        if (report.matchedKeywords.isEmpty()) {
            Text("No matched skills found.", color = TextSub, fontSize = 14.sp)
        } else {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                report.matchedKeywords.forEach { kw ->
                    Surface(color = Accent.copy(alpha = 0.12f), shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Accent)) {
                        Row(modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, null, tint = Accent, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(kw, color = Accent, fontSize = 13.sp)
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(24.dp))
        Text("Missing Skills", color = Danger, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(Modifier.height(12.dp))
        if (report.missingKeywords.isEmpty()) {
            Text("No missing skills detected.", color = TextSub, fontSize = 14.sp)
        } else {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                report.missingKeywords.forEach { kw ->
                    Surface(color = Danger.copy(alpha = 0.12f), shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Danger)) {
                        Text(kw, color = Danger, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
                    }
                }
            }
        }

        Spacer(Modifier.height(24.dp))
        Text("Recommendations", color = TextPrime, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(Modifier.height(12.dp))
        if (report.recommendations.isEmpty()) {
            Text("No specific recommendations at this time.", color = TextSub, fontSize = 14.sp)
        } else {
            report.recommendations.forEach { rec ->
                Card(colors = CardDefaults.cardColors(containerColor = BgCard), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Text(rec, color = TextPrime, fontSize = 13.sp, modifier = Modifier.padding(12.dp), lineHeight = 18.sp)
                }
            }
        }

        Spacer(Modifier.height(32.dp))
        Button(
            onClick = onReset,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = BgCard)
        ) {
            Text("Analyze Another Job", color = TextPrime)
        }
    }
}
