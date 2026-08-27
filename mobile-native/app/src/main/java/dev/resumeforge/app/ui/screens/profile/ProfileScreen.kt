package dev.resumeforge.app.ui.screens.profile
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun ProfileScreen() {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Profile", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(value = "Jo", onValueChange = {}, label = { Text("Name") })
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(value = "jo@example.com", onValueChange = {}, label = { Text("Email") })
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = { /* Save explicitly */ }) {
            Text("Save Profile")
        }
    }
}
