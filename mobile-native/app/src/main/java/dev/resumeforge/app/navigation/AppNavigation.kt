package dev.resumeforge.app.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import dev.resumeforge.app.ui.screens.auth.AuthViewModel
import dev.resumeforge.app.ui.screens.auth.LoginScreen
import dev.resumeforge.app.ui.screens.auth.SessionState
import dev.resumeforge.app.ui.screens.home.HomeScreen
import dev.resumeforge.app.ui.screens.home.HomeViewModel

private val BgDeep = Color(0xFF0D1117)

@Composable
fun AppNavigation() {
    val navController  = rememberNavController()
    val authViewModel: AuthViewModel = viewModel()
    val homeViewModel: HomeViewModel = viewModel()

    val sessionState by authViewModel.sessionState.collectAsState()

    // Show a branded splash while checking the stored token.
    if (sessionState == SessionState.Checking) {
        Box(
            Modifier.fillMaxSize().background(BgDeep),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = Color(0xFF00C47D))
        }
        return
    }

    val startDestination = if (sessionState == SessionState.Authenticated) "home" else "auth"

    NavHost(navController = navController, startDestination = startDestination) {

        composable("auth") {
            LoginScreen(
                viewModel = authViewModel,
                onLoginSuccess = {
                    navController.navigate("home") {
                        popUpTo("auth") { inclusive = true }
                    }
                },
                onNavigateRegister = { /* TODO: register route */ }
            )
        }

        composable("home") {
            HomeScreen(
                authViewModel   = authViewModel,
                homeViewModel   = homeViewModel,
                onNavigateAts   = { /* TODO: navigate to ATS route */ },
                onNavigateAi    = { /* TODO: navigate to AI route  */ },
                onNavigateResumes = { /* TODO: navigate to Resumes */ },
                onNavigateProfile = { /* TODO: navigate to Profile */ },
                onLogout = {
                    navController.navigate("auth") {
                        popUpTo("home") { inclusive = true }
                    }
                }
            )
        }
    }
}
