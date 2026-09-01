package dev.resumeforge.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.resumeforge.app.ui.screens.auth.AuthViewModel

// ── Design tokens ─────────────────────────────────────────────────────────────
private val BgDeep    = Color(0xFF0F172A)
private val BgSurface = Color(0xFF1E293B)
private val BgCard    = Color(0xFF1E293B)
private val Accent    = Color(0xFF10B981)
private val TextPrime = Color.White
private val TextSub   = Color(0xFF94A3B8)
private val Border    = Color(0xFF334155)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    authViewModel: AuthViewModel,
    onBack: () -> Unit
) {
    val user = authViewModel.currentUser.collectAsState().value
    var firstName by remember(user) { mutableStateOf(user?.firstName ?: "") }
    var lastName by remember(user) { mutableStateOf(user?.lastName ?: "") }
    var email by remember(user) { mutableStateOf(user?.email ?: "") }

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
                        Text("My Profile", color = TextPrime, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                    }
                    HorizontalDivider(color = Border, thickness = 1.dp)
                }
            }
        },
        bottomBar = {
            Surface(color = BgDeep, tonalElevation = 0.dp) {
                Column {
                    HorizontalDivider(color = Border, thickness = 1.dp)
                    Box(Modifier.fillMaxWidth().padding(24.dp).navigationBarsPadding()) {
                        Button(
                            onClick = {
                                authViewModel.updateProfile(
                                    dev.resumeforge.app.data.models.UpdateProfileRequest(
                                        email = email,
                                        firstName = firstName,
                                        lastName = lastName
                                    )
                                )
                                onBack()
                            },
                            modifier = Modifier.fillMaxWidth().height(56.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Accent),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Save Changes", color = Color(0xFF0F172A), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                    }
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Avatar
            Surface(
                modifier = Modifier.size(100.dp),
                shape = CircleShape,
                color = Accent.copy(alpha = 0.15f),
                border = androidx.compose.foundation.BorderStroke(2.dp, Accent)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    val initials = if (firstName.isNotEmpty() && lastName.isNotEmpty()) "${firstName.first()}${lastName.first()}" else "U"
                    Text(initials.uppercase(), color = Accent, fontSize = 36.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.height(32.dp))
            
            // Info form
            Card(
                colors = CardDefaults.cardColors(containerColor = BgCard),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(24.dp)) {
                    Text("Personal Information", color = TextPrime, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(20.dp))
                    
                    OutlinedTextField(
                        value = firstName,
                        onValueChange = { firstName = it },
                        label = { Text("First Name", color = TextSub) },
                        leadingIcon = { Icon(Icons.Default.Person, null, tint = TextSub) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = rfFieldColors(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(
                        value = lastName,
                        onValueChange = { lastName = it },
                        label = { Text("Last Name", color = TextSub) },
                        leadingIcon = { Icon(Icons.Default.Person, null, tint = TextSub) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = rfFieldColors(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email", color = TextSub) },
                        leadingIcon = { Icon(Icons.Default.Email, null, tint = TextSub) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = rfFieldColors(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun rfFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor   = Accent,
    unfocusedBorderColor = Border,
    focusedTextColor     = TextPrime,
    unfocusedTextColor   = TextPrime,
    cursorColor          = Accent,
    focusedContainerColor = Color.Transparent,
    unfocusedContainerColor = Color.Transparent
)
