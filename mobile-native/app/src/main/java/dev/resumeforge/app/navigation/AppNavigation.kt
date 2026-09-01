package dev.resumeforge.app.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import dev.resumeforge.app.ui.screens.ai.AiChatScreen
import dev.resumeforge.app.ui.screens.ai.AiViewModel
import dev.resumeforge.app.ui.screens.ats.AtsViewModel
import dev.resumeforge.app.ui.screens.ats.AtsWorkspaceScreen
import dev.resumeforge.app.ui.screens.ats.JobMatchScreen
import dev.resumeforge.app.ui.screens.auth.AuthViewModel
import dev.resumeforge.app.ui.screens.auth.LoginScreen
import dev.resumeforge.app.ui.screens.auth.RegisterScreen
import dev.resumeforge.app.ui.screens.auth.SessionState
import dev.resumeforge.app.ui.screens.home.HomeScreen
import dev.resumeforge.app.ui.screens.home.HomeViewModel
import dev.resumeforge.app.ui.screens.profile.ProfileScreen
import dev.resumeforge.app.ui.screens.resume.ResumeListScreen
import dev.resumeforge.app.ui.screens.resume.ResumeWizardScreen
import dev.resumeforge.app.ui.screens.resume.ResumeEditorViewModel
import dev.resumeforge.app.ui.screens.settings.SettingsScreen
import dev.resumeforge.app.ui.screens.templates.TemplatesScreen

private val BgDeep    = Color(0xFF0D1117)
private val BgSurface = Color(0xFF161B22)
private val Accent    = Color(0xFF00C47D)
private val TextSub   = Color(0xFF8B949E)
private val TextPrime = Color(0xFFE6EDF3)
private val Border    = Color(0xFF21262D)

// ─── Route constants ──────────────────────────────────────────────────────────
object Routes {
    const val AUTH        = "auth"
    const val REGISTER    = "register"
    const val MAIN        = "main"
    const val HOME        = "home"
    const val RESUMES     = "resumes"
    const val RESUME_NEW  = "resume_new"
    const val ATS         = "ats"
    const val AI          = "ai"
    const val PROFILE     = "profile"
    const val SETTINGS    = "settings"
    const val TEMPLATES   = "templates"
    const val JOB_MATCH   = "job_match"
}

// ─── Bottom-nav items ─────────────────────────────────────────────────────────
data class BottomNavItem(val route: String, val label: String, val icon: ImageVector)

val bottomNavItems = listOf(
    BottomNavItem(Routes.HOME,     "Home",    Icons.Default.Home),
    BottomNavItem(Routes.RESUMES,  "Resumes", Icons.Default.Description),
    BottomNavItem(Routes.ATS,      "ATS",     Icons.Default.Analytics),
    BottomNavItem(Routes.AI,       "AI",      Icons.Default.AutoAwesome)
)

// ─── Root navigation ──────────────────────────────────────────────────────────
@Composable
fun AppNavigation() {
    val rootNavController = rememberNavController()
    val authViewModel: AuthViewModel = viewModel()
    val sessionState by authViewModel.sessionState.collectAsState()

    // Branded splash while restoring session
    if (sessionState == SessionState.Checking) {
        Box(
            Modifier.fillMaxSize().background(BgDeep),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(color = Accent)
                Spacer(Modifier.height(16.dp))
                Text("ResumeForge", color = TextPrime, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
        }
        return
    }

    val startDestination = if (sessionState == SessionState.Authenticated) Routes.MAIN else Routes.AUTH

    NavHost(navController = rootNavController, startDestination = startDestination) {

        composable(Routes.AUTH) {
            LoginScreen(
                viewModel = authViewModel,
                onLoginSuccess = {
                    rootNavController.navigate(Routes.MAIN) {
                        popUpTo(Routes.AUTH) { inclusive = true }
                    }
                },
                onNavigateRegister = { rootNavController.navigate(Routes.REGISTER) }
            )
        }

        composable(Routes.REGISTER) {
            RegisterScreen(
                viewModel = authViewModel,
                onRegisterSuccess = {
                    rootNavController.navigate(Routes.MAIN) {
                        popUpTo(Routes.AUTH) { inclusive = true }
                    }
                },
                onNavigateLogin = { rootNavController.popBackStack() }
            )
        }

        composable(Routes.MAIN) {
            MainScaffold(
                authViewModel = authViewModel,
                onLogout = {
                    rootNavController.navigate(Routes.AUTH) {
                        popUpTo(Routes.MAIN) { inclusive = true }
                    }
                }
            )
        }
    }
}

// ─── Main scaffold with bottom navigation ────────────────────────────────────
@Composable
fun MainScaffold(authViewModel: AuthViewModel, onLogout: () -> Unit) {
    val mainNavController = rememberNavController()
    val homeViewModel: HomeViewModel = viewModel()
    val atsViewModel: AtsViewModel = viewModel()
    val aiViewModel: AiViewModel = viewModel()
    val resumeEditorViewModel: ResumeEditorViewModel = viewModel()

    val navBackStackEntry by mainNavController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Routes that show bottom nav
    val showBottomBar = currentRoute in bottomNavItems.map { it.route }

    Scaffold(
        containerColor = BgDeep,
        bottomBar = {
            if (showBottomBar) {
                AppBottomNavigationBar(
                    navController = mainNavController,
                    currentRoute  = currentRoute
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController    = mainNavController,
            startDestination = Routes.HOME,
            modifier         = Modifier.padding(innerPadding)
        ) {
            composable(Routes.HOME) {
                HomeScreen(
                    authViewModel     = authViewModel,
                    homeViewModel     = homeViewModel,
                    onNavigateAts     = { mainNavController.navigate(Routes.ATS) },
                    onNavigateAi      = { mainNavController.navigate(Routes.AI) },
                    onNavigateResumes = { mainNavController.navigate(Routes.RESUMES) },
                    onNavigateProfile = { mainNavController.navigate(Routes.PROFILE) },
                    onLogout          = onLogout
                )
            }

            composable(Routes.RESUMES) {
                ResumeListScreen(
                    authViewModel = authViewModel,
                    onCreateClick = { mainNavController.navigate(Routes.RESUME_NEW) },
                    onAnalyzeClick = { mainNavController.navigate(Routes.ATS) }
                )
            }

            composable(Routes.RESUME_NEW) {
                ResumeWizardScreen(
                    viewModel  = resumeEditorViewModel,
                    onComplete = {
                        mainNavController.popBackStack(Routes.RESUMES, inclusive = false)
                        // Refresh home data after save
                    },
                    onBack = { mainNavController.popBackStack() }
                )
            }

            composable(Routes.ATS) {
                AtsWorkspaceScreen(
                    viewModel     = atsViewModel,
                    authViewModel = authViewModel
                )
            }

            composable(Routes.AI) {
                AiChatScreen(viewModel = aiViewModel)
            }

            composable(Routes.PROFILE) {
                ProfileScreen(
                    authViewModel = authViewModel,
                    onBack        = { mainNavController.popBackStack() }
                )
            }

            composable(Routes.SETTINGS) {
                SettingsScreen(
                    onLogout = onLogout,
                    onBack   = { mainNavController.popBackStack() }
                )
            }

            composable(Routes.TEMPLATES) {
                TemplatesScreen(onBack = { mainNavController.popBackStack() })
            }
            
            composable(Routes.JOB_MATCH) {
                JobMatchScreen(
                    viewModel     = atsViewModel,
                    authViewModel = authViewModel,
                    onBack        = { mainNavController.popBackStack() }
                )
            }
        }
    }
}

// ─── Bottom Navigation Bar ────────────────────────────────────────────────────
@Composable
fun AppBottomNavigationBar(navController: NavController, currentRoute: String?) {
    Surface(
        color     = BgSurface,
        tonalElevation = 0.dp
    ) {
        Column {
            HorizontalDivider(color = Border, thickness = 0.5.dp)
            NavigationBar(
                containerColor = BgSurface,
                tonalElevation = 0.dp
            ) {
                bottomNavItems.forEach { item ->
                    val selected = currentRoute == item.route
                    NavigationBarItem(
                        selected = selected,
                        onClick  = {
                            if (!selected) {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState    = true
                                }
                            }
                        },
                        icon = {
                            Icon(
                                imageVector = item.icon,
                                contentDescription = item.label,
                                tint = if (selected) Accent else TextSub
                            )
                        },
                        label = {
                            Text(
                                item.label,
                                fontSize = 11.sp,
                                color    = if (selected) Accent else TextSub,
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor   = Accent,
                            unselectedIconColor = TextSub,
                            indicatorColor      = Accent.copy(alpha = 0.12f)
                        )
                    )
                }
            }
        }
    }
}
