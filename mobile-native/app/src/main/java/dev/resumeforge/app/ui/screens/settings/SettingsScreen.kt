package dev.resumeforge.app.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
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

// ── Design tokens ─────────────────────────────────────────────────────────────
private val BgDeep    = Color(0xFF0F172A)
private val BgSurface = Color(0xFF1E293B)
private val BgCard    = Color(0xFF1E293B)
private val TextPrime = Color.White
private val TextSub   = Color(0xFF94A3B8)
private val Danger    = Color(0xFFEF4444)
private val Border    = Color(0xFF334155)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onLogout: () -> Unit,
    onBack: () -> Unit
) {
    var showLogoutDialog by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = BgDeep,
        topBar = {
            Surface(color = BgDeep, tonalElevation = 0.dp) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.ArrowBack, "Back", tint = TextPrime)
                        }
                        Text("Settings", color = TextPrime, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                    }
                    HorizontalDivider(color = Border, thickness = 1.dp)
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding).fillMaxSize().background(BgDeep),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                SettingsSection(
                    title = "Preferences",
                    items = listOf(
                        SettingsItemData(Icons.Default.DarkMode, "Dark Mode", "Enabled by default"),
                        SettingsItemData(Icons.Default.Notifications, "Notifications", "Manage alerts")
                    )
                )
            }
            
            item {
                SettingsSection(
                    title = "Support",
                    items = listOf(
                        SettingsItemData(Icons.Default.Help, "Help Center", "FAQs and guides"),
                        SettingsItemData(Icons.Default.PrivacyTip, "Privacy Policy", "How we handle your data"),
                        SettingsItemData(Icons.Default.Article, "Terms of Service", "Rules and agreements")
                    )
                )
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = BgCard),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showLogoutDialog = true }.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Logout, null, tint = Danger, modifier = Modifier.size(24.dp))
                        Spacer(Modifier.width(16.dp))
                        Text("Log Out", color = Danger, fontWeight = FontWeight.Medium, fontSize = 16.sp)
                    }
                }
            }
            
            item {
                Box(Modifier.fillMaxWidth().padding(top = 16.dp), contentAlignment = Alignment.Center) {
                    Text("ResumeForge v1.0.0", color = TextSub, fontSize = 12.sp)
                }
            }
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            containerColor = BgCard,
            titleContentColor = TextPrime,
            textContentColor = TextSub,
            title = { Text("Log Out") },
            text = { Text("Are you sure you want to log out of your account?") },
            confirmButton = {
                TextButton(onClick = { showLogoutDialog = false; onLogout() }, colors = ButtonDefaults.textButtonColors(contentColor = Danger)) {
                    Text("Log Out")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }, colors = ButtonDefaults.textButtonColors(contentColor = TextPrime)) {
                    Text("Cancel")
                }
            }
        )
    }
}

data class SettingsItemData(val icon: ImageVector, val title: String, val subtitle: String)

@Composable
private fun SettingsSection(title: String, items: List<SettingsItemData>) {
    Column {
        Text(title, color = TextSub, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = BgCard),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column {
                items.forEachIndexed { index, item ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(item.icon, null, tint = TextSub, modifier = Modifier.size(24.dp))
                        Spacer(Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.title, color = TextPrime, fontSize = 16.sp, fontWeight = FontWeight.Medium)
                            Text(item.subtitle, color = TextSub, fontSize = 13.sp)
                        }
                        Icon(Icons.Default.ChevronRight, null, tint = TextSub, modifier = Modifier.size(20.dp))
                    }
                    if (index < items.size - 1) {
                        HorizontalDivider(color = Border, thickness = 1.dp, modifier = Modifier.padding(start = 56.dp))
                    }
                }
            }
        }
    }
}
