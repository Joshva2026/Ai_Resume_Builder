package dev.resumeforge.app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import dev.resumeforge.app.ui.screens.auth.AuthViewModel
import dev.resumeforge.app.ui.screens.auth.LoginScreen
import dev.resumeforge.app.ui.screens.home.HomeScreen

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val authViewModel = remember { AuthViewModel() }
    
    NavHost(navController = navController, startDestination = "auth") {
        composable("auth") {
            LoginScreen(
                viewModel = authViewModel,
                onLoginSuccess = { navController.navigate("home") { popUpTo("auth") { inclusive = true } } },
                onNavigateRegister = { /* TODO */ }
            )
        }
        composable("home") {
            HomeScreen(
                authViewModel = authViewModel,
                onLogout = { navController.navigate("auth") { popUpTo("home") { inclusive = true } } }
            )
        }
    }
}
