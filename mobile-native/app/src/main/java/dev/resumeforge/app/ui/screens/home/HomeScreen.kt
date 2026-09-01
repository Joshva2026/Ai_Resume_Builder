package dev.resumeforge.app.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import dev.resumeforge.app.data.models.Resume
import dev.resumeforge.app.ui.screens.auth.AuthViewModel
import java.util.Calendar

// ─── Brand colours ───────────────────────────────────────────────────────────
private val BgDeep     = Color(0xFF0F172A)
private val BgCard     = Color(0xFF1E293B)
private val Accent     = Color(0xFF10B981)
private val AccentDim  = Color(0xFF10B981).copy(alpha = 0.12f)
private val TextPrime  = Color.White
private val TextSub    = Color(0xFF94A3B8)
private val DangerCard = Color(0xFF2D1518)
private val Danger     = Color(0xFFEF4444)

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
        contentPadding = PaddingValues(bottom = 32.dp, top = 24.dp)
    ) {
        // ── Greeting header ───────────────────────────────────────────────
        item { GreetingHeader(data, onNavigateProfile) }

        // ── Career Strength ───────────────────────────────────────────────
        item { Spacer(Modifier.height(24.dp)) }
        item { CareerStrengthCard(data.latestAtsScore) }

        // ── Stats Grid ─────────────────────────────────────────────────
        item { Spacer(Modifier.height(16.dp)) }
        item {
            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                StatCard(title = "Total Resumes", value = "${data.resumes.size}", modifier = Modifier.weight(1f))
                StatCard(title = "Avg ATS Score", value = "${data.latestAtsScore ?: 0}%", valueColor = Accent, modifier = Modifier.weight(1f))
            }
        }
        item { Spacer(Modifier.height(16.dp)) }
        item {
            val skillsCount = data.resumes.flatMap { it.content?.skills ?: emptyList() }.distinct().size
            // Simple profile completion calculation based on User fields
            var filledFields = 1 // email always present
            if (!data.user.firstName.isNullOrBlank()) filledFields++
            if (!data.user.lastName.isNullOrBlank()) filledFields++
            val totalFields = 3
            val profileCompletion = (filledFields * 100) / totalFields

            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                StatCard(title = "Skills Indexed", value = "$skillsCount", modifier = Modifier.weight(1f))
                StatCard(title = "Profile Completion", value = "$profileCompletion%", modifier = Modifier.weight(1f))
            }
        }

        // ── AI Recommendation ─────────────────────────────────────────────────
        item { Spacer(Modifier.height(16.dp)) }
        item { AiRecommendationCard() }

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
                Text(
                    "My Resumes",
                    color = TextPrime,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                TextButton(onClick = onCreateResume, contentPadding = PaddingValues(0.dp)) {
                    Text("See All", color = Accent, fontSize = 14.sp)
                }
            }
        }
        item { Spacer(Modifier.height(8.dp)) }

        if (data.resumes.isEmpty()) {
            item { EmptyResumesCard(onCreateResume) }
        } else {
            // Show at most 3 on the home screen
            items(data.resumes.take(3)) { resume ->
                ResumeListItem(
                    resume = resume,
                    onEdit = onCreateResume,
                    onAnalyze = onNavigateAts
                )
                Spacer(Modifier.height(12.dp))
            }
        }
    }
}

// ─── Greeting Header ─────────────────────────────────────────────────────────

@Composable
private fun GreetingHeader(data: HomeDashboardData, onProfile: () -> Unit) {
    val greeting = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
        in 5..11  -> "Good Morning,"
        in 12..16 -> "Good Afternoon,"
        else      -> "Good Evening,"
    }
    val displayName = data.user.firstName?.takeIf { it.isNotBlank() } ?: data.user.email.substringBefore("@")

    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(AccentDim),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Person, contentDescription = "Profile", tint = Accent)
            }
            Spacer(Modifier.width(12.dp))
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
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        IconButton(
            onClick = onProfile,
            modifier = Modifier.size(40.dp)
        ) {
            Icon(Icons.Default.Person, contentDescription = "Profile Settings", tint = TextPrime)
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
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF0F172A)),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(
                    progress = (latestAtsScore ?: 0) / 100f,
                    modifier = Modifier.fillMaxSize().padding(4.dp),
                    color = Accent,
                    trackColor = Color(0xFF1E293B),
                    strokeWidth = 4.dp
                )
                Text(
                    text = "${latestAtsScore ?: 0}",
                    color = TextPrime,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp
                )
            }
            
            Spacer(Modifier.width(16.dp))

            Column {
                Text("Career Strength Score", color = TextPrime, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "Your ATS profile health is looking great. 3 optimizations pending.",
                    color = TextSub,
                    fontSize = 13.sp,
                    lineHeight = 18.sp
                )
            }
        }
    }
}

@Composable
private fun StatCard(title: String, value: String, valueColor: Color = TextPrime, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = BgCard),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, color = TextSub, fontSize = 13.sp)
            Spacer(Modifier.height(8.dp))
            Text(value, color = valueColor, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun AiRecommendationCard() {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(containerColor = AccentDim),
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Accent.copy(alpha = 0.3f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Warning, contentDescription = "AI", tint = Accent, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text("AI Recommendation", color = Accent, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(8.dp))
            Text(
                "Add Docker and GraphQL to your Skills section to match the Senior Frontend Engineer role at Vercel.",
                color = TextPrime,
                fontSize = 14.sp,
                lineHeight = 20.sp
            )
        }
    }
}

// ─── Resume list item ─────────────────────────────────────────────────────────

@Composable
private fun ResumeListItem(resume: Resume, onEdit: () -> Unit, onAnalyze: () -> Unit) {
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
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        resume.title,
                        color = TextPrime,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(Modifier.height(4.dp))
                    Text("Modified recently", color = TextSub, fontSize = 12.sp)
                }
                
                Surface(
                    color = AccentDim,
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Accent)
                ) {
                    Text(
                        "${resume.ats_score ?: 0} ATS",
                        color = Accent,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
            }
            
            Spacer(Modifier.height(16.dp))
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(
                    onClick = onEdit,
                    modifier = Modifier.weight(1f).height(40.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F172A)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Edit", color = TextPrime)
                }
                Button(
                    onClick = onAnalyze,
                    modifier = Modifier.weight(1f).height(40.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F172A)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Analyze", color = TextPrime)
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
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("No resumes yet", color = TextPrime, fontWeight = FontWeight.Medium, fontSize = 16.sp)
            Spacer(Modifier.height(8.dp))
            Text("Build your first resume to get started.", color = TextSub, fontSize = 14.sp)
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onCreate,
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Create Your First Resume", color = BgDeep, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

// ─── Loading view ─────────────────────────────────────────────────────────────

@Composable
private fun LoadingView() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = Accent)
    }
}

// ─── Error view ───────────────────────────────────────────────────────────────

@Composable
private fun ErrorView(message: String, onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Text("Error: $message", color = Danger)
    }
}

