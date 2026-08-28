package dev.resumeforge.app.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import dev.resumeforge.app.data.models.Resume
import dev.resumeforge.app.ui.screens.auth.AuthViewModel
import java.util.Calendar

// ─── Brand colours ───────────────────────────────────────────────────────────
private val BgDeep     = Color(0xFF0D1117)
private val BgSurface  = Color(0xFF161B22)
private val BgCard     = Color(0xFF1C2128)
private val Accent     = Color(0xFF00C47D)
private val AccentDim  = Color(0xFF00C47D).copy(alpha = 0.12f)
private val TextPrime  = Color(0xFFE6EDF3)
private val TextSub    = Color(0xFF8B949E)
private val DangerCard = Color(0xFF2D1518)
private val Danger     = Color(0xFFF85149)

@Composable
fun HomeScreen(
    authViewModel: AuthViewModel,
    homeViewModel: HomeViewModel = viewModel(),
    onNavigateAts: () -> Unit = {},
    onNavigateAi: () -> Unit = {},
    onNavigateResumes: () -> Unit = {},
    onNavigateProfile: () -> Unit = {},
    onLogout: () -> Unit
) {
    val user by authViewModel.currentUser.collectAsState()
    val uiState by homeViewModel.uiState.collectAsState()

    // Load dashboard once user is available
    LaunchedEffect(user) {
        val u = user
        if (u != null) homeViewModel.loadDashboard(u)
    }

    // Handle session expiry
    LaunchedEffect(uiState) {
        if (uiState is HomeUiState.SessionExpired) {
            authViewModel.logout()
            onLogout()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeep)
    ) {
        when (val state = uiState) {
            is HomeUiState.Loading -> LoadingView()
            is HomeUiState.Error   -> ErrorView(state.message) {
                val u = user
                if (u != null) homeViewModel.retry(u)
            }
            is HomeUiState.SessionExpired -> LoadingView() // brief while routing back
            is HomeUiState.Success -> DashboardContent(
                data = state.data,
                onCreateResume  = onNavigateResumes,
                onNavigateAts   = onNavigateAts,
                onNavigateAi    = onNavigateAi,
                onNavigateProfile = onNavigateProfile,
                onLogout = {
                    authViewModel.logout()
                    onLogout()
                }
            )
        }
    }
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

@Composable
private fun DashboardContent(
    data: HomeDashboardData,
    onCreateResume: () -> Unit,
    onNavigateAts: () -> Unit,
    onNavigateAi: () -> Unit,
    onNavigateProfile: () -> Unit,
    onLogout: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 32.dp)
    ) {
        // ── Greeting header ───────────────────────────────────────────────
        item { GreetingHeader(data, onNavigateProfile) }

        // ── Career Strength ───────────────────────────────────────────────
        item { Spacer(Modifier.height(16.dp)) }
        item { CareerStrengthCard(data.latestAtsScore) }

        // ── Quick Actions ─────────────────────────────────────────────────
        item { Spacer(Modifier.height(20.dp)) }
        item { SectionLabel("Quick Actions") }
        item { Spacer(Modifier.height(10.dp)) }
        item {
            QuickActionsRow(
                onCreateResume  = onCreateResume,
                onNavigateAts   = onNavigateAts,
                onNavigateAi    = onNavigateAi,
                onNavigateProfile = onNavigateProfile
            )
        }

        // ── Resumes ───────────────────────────────────────────────────────
        item { Spacer(Modifier.height(24.dp)) }
        item {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                SectionLabel("Your Resumes (${data.resumes.size})", modifier = Modifier)
                TextButton(onClick = onCreateResume) {
                    Text("View All", color = Accent, fontSize = 13.sp)
                }
            }
        }
        item { Spacer(Modifier.height(8.dp)) }

        if (data.resumes.isEmpty()) {
            item { EmptyResumesCard(onCreateResume) }
        } else {
            // Show at most 3 on the home screen
            items(data.resumes.take(3)) { resume ->
                ResumeListItem(resume)
                Spacer(Modifier.height(8.dp))
            }
        }

        // ── Logout ────────────────────────────────────────────────────────
        item { Spacer(Modifier.height(24.dp)) }
        item {
            OutlinedButton(
                onClick = onLogout,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Danger),
                border = androidx.compose.foundation.BorderStroke(1.dp, Danger.copy(alpha = 0.5f))
            ) {
                Text("Log Out", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

// ─── Greeting Header ─────────────────────────────────────────────────────────

@Composable
private fun GreetingHeader(data: HomeDashboardData, onProfile: () -> Unit) {
    val greeting = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
        in 5..11  -> "Good Morning"
        in 12..16 -> "Good Afternoon"
        else      -> "Good Evening"
    }
    val displayName = data.user.firstName?.takeIf { it.isNotBlank() } ?: data.user.email.substringBefore("@")

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(listOf(BgSurface, BgDeep))
            )
            .padding(horizontal = 16.dp, vertical = 24.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = greeting,
                    color = TextSub,
                    fontSize = 14.sp
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = displayName,
                    color = TextPrime,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "${data.resumes.size} resume${if (data.resumes.size == 1) "" else "s"} · ResumeForge",
                    color = TextSub,
                    fontSize = 13.sp
                )
            }

            IconButton(
                onClick = onProfile,
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(AccentDim)
            ) {
                Icon(Icons.Default.Person, contentDescription = "Profile", tint = Accent)
            }
        }
    }
}

// ─── Career Strength ─────────────────────────────────────────────────────────

@Composable
private fun CareerStrengthCard(latestAtsScore: Int?) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Career Strength", color = TextSub, fontSize = 13.sp)
                Spacer(Modifier.height(6.dp))
                if (latestAtsScore != null) {
                    Text(
                        text = "$latestAtsScore / 100",
                        color = Accent,
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "Based on your latest ATS scan",
                        color = TextSub,
                        fontSize = 12.sp
                    )
                } else {
                    Text(
                        text = "— / 100",
                        color = TextSub,
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "Run an ATS scan to see your score",
                        color = TextSub,
                        fontSize = 12.sp
                    )
                }
            }

            if (latestAtsScore != null) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(AccentDim),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "$latestAtsScore",
                        color = Accent,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )
                }
            }
        }
    }
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

@Composable
private fun QuickActionsRow(
    onCreateResume: () -> Unit,
    onNavigateAts: () -> Unit,
    onNavigateAi: () -> Unit,
    onNavigateProfile: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        QuickActionChip(label = "New Resume",  icon = Icons.Default.Add,                                modifier = Modifier.weight(1f), onClick = onCreateResume)
        QuickActionChip(label = "ATS Check",   icon = Icons.AutoMirrored.Filled.ArrowForward,           modifier = Modifier.weight(1f), onClick = onNavigateAts)
        QuickActionChip(label = "AI Chat",     icon = Icons.AutoMirrored.Filled.ArrowForward,           modifier = Modifier.weight(1f), onClick = onNavigateAi)
    }
}

@Composable
private fun QuickActionChip(label: String, icon: ImageVector, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = modifier.height(72.dp),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(icon, contentDescription = label, tint = Accent, modifier = Modifier.size(22.dp))
            Spacer(Modifier.height(4.dp))
            Text(label, color = TextPrime, fontSize = 11.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

// ─── Resume list item ─────────────────────────────────────────────────────────

@Composable
private fun ResumeListItem(resume: Resume) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    resume.title,
                    color = TextPrime,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(2.dp))
                val atsText = resume.ats_score?.let { "ATS $it / 100" } ?: "No ATS score yet"
                Text(atsText, color = TextSub, fontSize = 12.sp)
            }
            if (resume.ats_score != null) {
                Spacer(Modifier.width(12.dp))
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(AccentDim),
                    contentAlignment = Alignment.Center
                ) {
                    Text("${resume.ats_score}", color = Accent, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
    }
}

// ─── Empty resumes card ───────────────────────────────────────────────────────

@Composable
private fun EmptyResumesCard(onCreate: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("No resumes yet", color = TextSub, fontWeight = FontWeight.Medium, fontSize = 15.sp)
            Spacer(Modifier.height(8.dp))
            Text("Build your first resume to get started.", color = TextSub, fontSize = 13.sp)
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onCreate,
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, tint = BgDeep)
                Spacer(Modifier.width(6.dp))
                Text("Create Your First Resume", color = BgDeep, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

// ─── Loading view ─────────────────────────────────────────────────────────────

@Composable
private fun LoadingView() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(color = Accent)
            Spacer(Modifier.height(16.dp))
            Text("Loading your dashboard…", color = TextSub, fontSize = 14.sp)
        }
    }
}

// ─── Error view ───────────────────────────────────────────────────────────────

@Composable
private fun ErrorView(message: String, onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Card(
                colors = CardDefaults.cardColors(containerColor = DangerCard),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Something went wrong", color = Danger, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                    Spacer(Modifier.height(8.dp))
                    // Surface a clean message; never expose raw stack traces or tokens
                    val cleanMsg = when {
                        message.contains("401") -> "Your session has expired. Please log in again."
                        message.contains("timeout", ignoreCase = true) -> "Connection timed out. Check your internet."
                        else -> "Unable to load your dashboard. Please try again."
                    }
                    Text(cleanMsg, color = TextSub, fontSize = 13.sp)
                }
            }
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = null, tint = BgDeep)
                Spacer(Modifier.width(6.dp))
                Text("Retry", color = BgDeep, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

@Composable
private fun SectionLabel(text: String, modifier: Modifier = Modifier.padding(horizontal = 16.dp)) {
    Text(
        text,
        modifier = modifier,
        color = TextSub,
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.8.sp
    )
}
