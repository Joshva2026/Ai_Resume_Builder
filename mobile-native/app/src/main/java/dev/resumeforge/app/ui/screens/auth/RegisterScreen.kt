package dev.resumeforge.app.ui.screens.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.resumeforge.app.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    viewModel: AuthViewModel,
    onRegisterSuccess: () -> Unit,
    onNavigateLogin: () -> Unit
) {
    var firstName by remember { mutableStateOf("") }
    var lastName  by remember { mutableStateOf("") }
    var email     by remember { mutableStateOf("") }
    var password  by remember { mutableStateOf("") }
    var confirm   by remember { mutableStateOf("") }
    var localError by remember { mutableStateOf<String?>(null) }

    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState) {
        if (uiState is AuthState.Success) {
            onRegisterSuccess()
            viewModel.resetState()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 48.dp)
        ) {
            Text(
                text = "Create Account",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Get started with your smart AI workspace",
                color = Color(0xFF94A3B8),
                fontSize = 14.sp
            )

            Spacer(Modifier.height(32.dp))

            RfTextField(
                value = firstName,
                onValueChange = { firstName = it; localError = null },
                label = "Full Name",
                placeholder = "Alex Carter"
            )

            Spacer(Modifier.height(20.dp))
            
            RfTextField(
                value = email,
                onValueChange = { email = it; localError = null },
                label = "Email Address",
                placeholder = "alex@resumeforge.ai"
            )

            Spacer(Modifier.height(20.dp))
            
            RfTextField(
                value = password,
                onValueChange = { password = it; localError = null },
                label = "Password",
                placeholder = "••••••••••••",
                isPassword = true,
                showStrength = true
            )

            Spacer(Modifier.height(20.dp))
            
            RfTextField(
                value = confirm,
                onValueChange = { confirm = it; localError = null },
                label = "Confirm Password",
                placeholder = "••••••••••••",
                isPassword = true
            )

            Spacer(Modifier.height(20.dp))
            
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(
                    checked = true,
                    onCheckedChange = {},
                    colors = CheckboxDefaults.colors(checkedColor = Color(0xFF10B981))
                )
                Text("I agree to the ", color = Color(0xFF94A3B8), fontSize = 14.sp)
                Text("Terms of Service", color = Color(0xFF10B981), fontSize = 14.sp)
                Text(" and ", color = Color(0xFF94A3B8), fontSize = 14.sp)
                Text("Privacy Policy", color = Color(0xFF10B981), fontSize = 14.sp)
            }

            // Local validation error
            val displayError = localError ?: (uiState as? AuthState.Error)?.message
            if (displayError != null) {
                Spacer(Modifier.height(12.dp))
                Text(displayError, color = Color(0xFFEF4444), fontSize = 14.sp)
            }

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = {
                    localError = when {
                        firstName.isBlank() -> "Full name is required"
                        email.isBlank() -> "Email is required"
                        password.length < 6 -> "Password must be at least 6 characters"
                        password != confirm -> "Passwords do not match"
                        else -> null
                    }
                    if (localError == null) {
                        viewModel.register(email.trim(), password, firstName.trim(), lastName.trim())
                    }
                },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                enabled = uiState !is AuthState.Loading,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (uiState is AuthState.Loading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Text("→ Create AI Workspace", fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = Color(0xFF0F172A))
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))

            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Divider(modifier = Modifier.weight(1f), color = Color(0xFF1E293B))
                Text(" EASY START ", color = Color(0xFF475569), fontSize = 12.sp)
                Divider(modifier = Modifier.weight(1f), color = Color(0xFF1E293B))
            }

            Spacer(modifier = Modifier.height(24.dp))
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Button(
                    onClick = { },
                    modifier = Modifier.weight(1f).height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Google", color = Color.White)
                }
                Button(
                    onClick = { },
                    modifier = Modifier.weight(1f).height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("LinkedIn", color = Color.White)
                }
            }

            Spacer(Modifier.height(32.dp))
            
            Row(horizontalArrangement = Arrangement.Center, modifier = Modifier.fillMaxWidth()) {
                Text("Already have an account? ", color = Color(0xFF94A3B8))
                Text("Log In", color = Color(0xFF10B981), modifier = Modifier.padding(start = 4.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RfTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String = "",
    modifier: Modifier = Modifier.fillMaxWidth(),
    isPassword: Boolean = false,
    showStrength: Boolean = false
) {
    Column(modifier = modifier) {
        Text(text = label, color = Color(0xFFCBD5E1), fontSize = 14.sp)
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text(placeholder, color = Color(0xFF475569)) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            visualTransformation = if (isPassword) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF10B981),
                unfocusedBorderColor = Color(0xFF1E293B),
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                cursorColor = Color(0xFF10B981),
                focusedContainerColor = Color(0xFF1E293B),
                unfocusedContainerColor = Color(0xFF1E293B)
            ),
            singleLine = true
        )
        if (showStrength) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Password Strength", color = Color(0xFF94A3B8), fontSize = 12.sp)
                Text("Strong", color = Color(0xFF10B981), fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Box(modifier = Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(2.dp)).background(Color(0xFF10B981)))
                Box(modifier = Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(2.dp)).background(Color(0xFF10B981)))
                Box(modifier = Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(2.dp)).background(Color(0xFF10B981)))
                Box(modifier = Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(2.dp)).background(Color(0xFF1E293B)))
            }
        }
    }
}
