package dev.resumeforge.app.ui.screens.ai

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun AiChatScreen(viewModel: AiViewModel) {
    val messages by viewModel.messages.collectAsState()
    val isSending by viewModel.isSending.collectAsState()
    var inputText by remember { mutableStateOf("") }
    
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("AI Career Assistant", style = MaterialTheme.typography.headlineMedium)
        Text("Your personal career copilot.", style = MaterialTheme.typography.bodyMedium)
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Chat History
        Column(modifier = Modifier.weight(1f)) {
            if (messages.isEmpty()) {
                Text("How can I help with your career today?", style = MaterialTheme.typography.bodyLarge)
            } else {
                for (msg in messages) {
                    Text("${msg.role}: ${msg.text}")
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }
        
        // Input Area
        Row(modifier = Modifier.fillMaxWidth()) {
            TextField(
                value = inputText,
                onValueChange = { inputText = it },
                modifier = Modifier.weight(1f),
                enabled = !isSending
            )
            Spacer(modifier = Modifier.width(8.dp))
            Button(
                onClick = { 
                    viewModel.sendMessage(inputText, null)
                    inputText = ""
                },
                enabled = !isSending && inputText.isNotBlank()
            ) {
                Text("Send")
            }
        }
    }
}
