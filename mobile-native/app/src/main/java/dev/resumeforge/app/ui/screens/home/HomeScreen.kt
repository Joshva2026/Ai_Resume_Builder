package dev.resumeforge.app.ui.screens.home

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.resumeforge.app.ui.screens.auth.AuthViewModel

@Composable
fun HomeScreen(authViewModel: AuthViewModel, onLogout: () -> Unit) {
    val user by authViewModel.currentUser.collectAsState()
    
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Good morning, ${user?.first_name ?: "Guest"}", style = MaterialTheme.typography.headlineMedium)
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Career Strength", style = MaterialTheme.typography.titleMedium)
                Text("-- / 100", style = MaterialTheme.typography.displayMedium)
                Text("No data available yet.", style = MaterialTheme.typography.bodySmall)
            }
        }
        
        Spacer(modifier = Modifier.weight(1f))
        
        Button(
            onClick = { 
                authViewModel.logout()
                onLogout()
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Log Out")
        }
    }
}
