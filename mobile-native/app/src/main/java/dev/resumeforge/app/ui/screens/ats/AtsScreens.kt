package dev.resumeforge.app.ui.screens.ats

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun AtsDashboardScreen(onAnalyzeClick: (Int) -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("ATS Resume Analyzer", style = MaterialTheme.typography.headlineMedium)
        Text("Understand how ready your resume is for real-world applicant tracking systems.", style = MaterialTheme.typography.bodyMedium)
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Placeholder for resume list selection
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("My Android Resume", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Button(onClick = { onAnalyzeClick(1) }) {
                    Text("Analyze Resume")
                }
            }
        }
    }
}

@Composable
fun AtsAnalyzerScreen(viewModel: AtsViewModel) {
    val state by viewModel.uiState.collectAsState()
    
    Column(modifier = Modifier.fillMaxSize().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        when (val s = state) {
            is AtsState.Idle -> {
                Text("Ready to analyze.", style = MaterialTheme.typography.bodyLarge)
            }
            is AtsState.Analyzing -> {
                CircularProgressIndicator(modifier = Modifier.size(64.dp))
                Spacer(modifier = Modifier.height(16.dp))
                Text(s.message, style = MaterialTheme.typography.bodyLarge)
            }
            is AtsState.Success -> {
                Text("ATS SCORE", style = MaterialTheme.typography.labelLarge)
                Text("${s.report.score} / 100", style = MaterialTheme.typography.displayLarge)
                Spacer(modifier = Modifier.height(32.dp))
                Text("Recommendations", style = MaterialTheme.typography.titleLarge)
                // Map recommendations here
            }
            is AtsState.Error -> {
                Text(s.message, color = MaterialTheme.colorScheme.error)
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = { /* Retry logic */ }) {
                    Text("Retry")
                }
            }
        }
    }
}
