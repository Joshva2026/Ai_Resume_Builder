package dev.resumeforge.app.ui.navigation
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun AppBottomNav() {
    NavigationBar {
        NavigationBarItem(selected = true, onClick = {}, icon = { Text("Home") })
        NavigationBarItem(selected = false, onClick = {}, icon = { Text("ATS") })
        NavigationBarItem(selected = false, onClick = {}, icon = { Text("AI") })
        NavigationBarItem(selected = false, onClick = {}, icon = { Text("Profile") })
    }
}
