package dev.resumeforge.app.ui.screens.resume

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun ResumeListScreen(onCreateClick: () -> Unit) {
    // Scaffolded for Phase 2 implementation
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Your Resumes", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(32.dp))
        
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(24.dp), horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
                Text("Build your first resume", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = onCreateClick) {
                    Text("Create Resume")
                }
            }
        }
    }
}
