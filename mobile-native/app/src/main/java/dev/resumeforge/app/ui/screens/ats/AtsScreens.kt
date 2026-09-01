package dev.resumeforge.app.ui.screens.ats

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.resumeforge.app.data.models.AtsReport
import dev.resumeforge.app.ui.screens.auth.AuthViewModel

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.ui.platform.LocalContext

// ── Design tokens ─────────────────────────────────────────────────────────────
private val BgDeep    = Color(0xFF0F172A)
private val BgSurface = Color(0xFF1E293B)
private val BgCard    = Color(0xFF1E293B)
private val Accent    = Color(0xFF10B981)
private val AccentDim = Color(0xFF10B981).copy(alpha = 0.12f)
private val TextPrime = Color.White
private val TextSub   = Color(0xFF94A3B8)
private val Danger    = Color(0xFFEF4444)
private val Warning   = Color(0xFFF0B429)
private val Border    = Color(0xFF334155)

@Composable
fun AtsWorkspaceScreen(
    viewModel: AtsViewModel,
    authViewModel: AuthViewModel
) {
    val uiState by viewModel.uiState.collectAsState()
    val resumes by viewModel.resumes.collectAsState()
    val history by viewModel.history.collectAsState()
    val selectedResumeId by viewModel.selectedResumeId.collectAsState()
    val context = LocalContext.current

    val pdfPickerLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            viewModel.analyzeUpload(context, uri)
        }
    }

    Box(Modifier.fillMaxSize().background(BgDeep)) {
        LazyColumn(
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            // ── Header ──────────────────────────────────────────────────────
            item {
                Surface(color = BgDeep, tonalElevation = 0.dp) {
                    Column(Modifier.padding(horizontal = 24.dp, vertical = 24.dp)) {
                        Text("ATS Checker", color = TextPrime, fontWeight = FontWeight.Bold, fontSize = 24.sp)
                        Spacer(Modifier.height(4.dp))
                        Text("Optimize your resume for Applicant Tracking Systems", color = TextSub, fontSize = 14.sp)
                    }
                }
                HorizontalDivider(color = Border, thickness = 1.dp)
            }

            // ── Resume picker ────────────────────────────────────────────────
            item {
                Spacer(Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SectionLabel("Select Resume to Analyze")
                    TextButton(onClick = { pdfPickerLauncher.launch("application/pdf") }) {
                        Icon(Icons.Default.UploadFile, null, tint = Accent, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Upload PDF", color = Accent, fontSize = 13.sp)
                    }
                }
                Spacer(Modifier.height(8.dp))
            }

            if (resumes.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        colors = CardDefaults.cardColors(containerColor = BgCard),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Description, null, tint = TextSub, modifier = Modifier.size(40.dp))
                            Spacer(Modifier.height(8.dp))
                            Text("No resumes found", color = TextSub, textAlign = TextAlign.Center)
                            Text("Create a resume first to run ATS analysis.", color = TextSub, fontSize = 12.sp, textAlign = TextAlign.Center)
                        }
                    }
                }
            } else {
                items(resumes) { resume ->
                    val isSelected = selectedResumeId == resume.id
                    Card(
                        onClick = { viewModel.selectResume(resume.id) },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) AccentDim else BgCard
                        ),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(resume.title, color = if (isSelected) Accent else TextPrime, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                            if (isSelected) Icon(Icons.Default.CheckCircle, null, tint = Accent, modifier = Modifier.size(20.dp))
                        }
                    }
                }
            }

            // ── Analyze button ───────────────────────────────────────────────
            item {
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = { viewModel.analyze() },
                    enabled = selectedResumeId != null && uiState !is AtsState.Analyzing,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).height(52.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Accent,
                        disabledContainerColor = Accent.copy(alpha = 0.4f)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (uiState is AtsState.Analyzing) {
                        CircularProgressIndicator(Modifier.size(22.dp), color = BgDeep, strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                        Text("Analyzing…", color = BgDeep, fontWeight = FontWeight.SemiBold)
                    } else {
                        Icon(Icons.Default.Analytics, null, tint = BgDeep, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Analyze with ATS", color = BgDeep, fontWeight = FontWeight.SemiBold)
                    }
                }
                Spacer(Modifier.height(24.dp))
            }

            // ── Result ───────────────────────────────────────────────────────
            when (val s = uiState) {
                is AtsState.Idle -> { /* nothing */ }
                is AtsState.Analyzing -> {
                    item {
                        Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                CircularProgressIndicator(color = Accent, modifier = Modifier.size(48.dp))
                                Spacer(Modifier.height(12.dp))
                                Text("Scanning your resume…", color = TextSub)
                            }
                        }
                    }
                }
                is AtsState.Success -> {
                    item { AtsResultCard(s.report) }
                }
                is AtsState.Error -> {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF2D1518)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Analysis failed", color = Danger, fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.height(8.dp))
                                Text(s.message, color = TextSub, fontSize = 13.sp, textAlign = TextAlign.Center)
                                Spacer(Modifier.height(16.dp))
                                Button(
                                    onClick = { viewModel.analyze() },
                                    enabled = selectedResumeId != null,
                                    colors = ButtonDefaults.buttonColors(containerColor = Accent),
                                    shape = RoundedCornerShape(10.dp)
                                ) { Text("Retry", color = BgDeep) }
                            }
                        }
                    }
                }
            }

            // ── History ──────────────────────────────────────────────────────
            if (history.isNotEmpty()) {
                item {
                    Spacer(Modifier.height(24.dp))
                    SectionLabel("ATS History", Modifier.padding(horizontal = 16.dp))
                    Spacer(Modifier.height(8.dp))
                }
                items(history) { report ->
                    AtsHistoryItem(report)
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
private fun AtsResultCard(report: AtsReport) {
    val score = report.score
    val scoreColor = when {
        score >= 80 -> Accent
        score >= 60 -> Warning
        else        -> Danger
    }
    Column(Modifier.padding(horizontal = 16.dp)) {
        // Score
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = BgCard),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("ATS Score", color = TextSub, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                Box(contentAlignment = Alignment.Center) {
                    Box(
                        modifier = Modifier.size(100.dp).clip(CircleShape).background(scoreColor.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("$score", color = scoreColor, fontWeight = FontWeight.Bold, fontSize = 36.sp)
                    }
                }
                Text("/ 100", color = TextSub, fontSize = 14.sp)
                Spacer(Modifier.height(8.dp))
                val label = when {
                    score >= 80 -> "Excellent"
                    score >= 60 -> "Good"
                    else        -> "Needs Work"
                }
                Surface(color = scoreColor.copy(alpha = 0.15f), shape = RoundedCornerShape(20.dp)) {
                    Text(label, color = scoreColor, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 14.dp, vertical = 5.dp))
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        // Matched keywords
        if (report.matchedKeywords.isNotEmpty()) {
            AtsSection(title = "Matched Keywords (${report.matchedKeywords.size})", color = Accent) {
                FlowRow(report.matchedKeywords, Accent)
            }
        }

        // Missing keywords
        if (report.missingKeywords.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            AtsSection(title = "Missing Keywords (${report.missingKeywords.size})", color = Danger) {
                FlowRow(report.missingKeywords, Danger)
            }
        }

        // Recommendations
        if (report.recommendations.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            AtsSection(title = "Recommendations", color = Warning) {
                report.recommendations.forEach { rec ->
                    Row(Modifier.padding(vertical = 3.dp)) {
                        Text("·", color = Warning, modifier = Modifier.width(16.dp))
                        Text(rec, color = TextSub, fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun AtsSection(title: String, color: Color, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(title, color = color, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(10.dp))
            content()
        }
    }
}

@Composable
private fun FlowRow(items: List<String>, chipColor: Color) {
    Column {
        items.chunked(3).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                row.forEach { kw ->
                    Surface(color = chipColor.copy(alpha = 0.12f), shape = RoundedCornerShape(20.dp)) {
                        Text(kw, color = chipColor, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                    }
                }
            }
            Spacer(Modifier.height(6.dp))
        }
    }
}

@Composable
private fun AtsHistoryItem(report: AtsReport) {
    val score = report.score
    val scoreColor = when {
        score >= 80 -> Accent
        score >= 60 -> Warning
        else        -> Danger
    }
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        shape = RoundedCornerShape(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(Modifier.weight(1f)) {
                Text("Resume #${report.resumeId}", color = TextPrime, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                Text(report.createdAt.take(10), color = TextSub, fontSize = 12.sp)
            }
            Surface(color = scoreColor.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                Text("$score", color = scoreColor, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(text, modifier = modifier, color = TextSub, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp)
}
