package dev.resumeforge.app.ui.screens.ai

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

// ── Design tokens ─────────────────────────────────────────────────────────────
private val BgDeep    = Color(0xFF0F172A)
private val BgSurface = Color(0xFF1E293B)
private val BgUser    = Color(0xFF1E293B)
private val BgAi      = Color(0xFF10B981).copy(alpha = 0.12f)
private val Accent    = Color(0xFF10B981)
private val TextPrime = Color.White
private val TextSub   = Color(0xFF94A3B8)
private val Border    = Color(0xFF334155)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiChatScreen(viewModel: AiViewModel) {
    val messages by viewModel.messages.collectAsState()
    val isSending by viewModel.isSending.collectAsState()
    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    // Auto-scroll to bottom on new message
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        containerColor = BgDeep,
        topBar = {
            Surface(color = BgDeep, tonalElevation = 0.dp) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(color = Accent.copy(alpha = 0.2f), shape = CircleShape) {
                            Icon(Icons.Default.AutoAwesome, null, tint = Accent, modifier = Modifier.padding(10.dp).size(24.dp))
                        }
                        Spacer(Modifier.width(16.dp))
                        Column {
                            Text("AI Career Coach", color = TextPrime, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            Spacer(Modifier.height(4.dp))
                            Text("Ask about interviews, cover letters, or career advice", color = TextSub, fontSize = 13.sp)
                        }
                    }
                    HorizontalDivider(color = Border, thickness = 1.dp)
                }
            }
        },
        bottomBar = {
            Surface(color = BgDeep, tonalElevation = 0.dp) {
                Column {
                    HorizontalDivider(color = Border, thickness = 1.dp)
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp).navigationBarsPadding(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = inputText,
                            onValueChange = { inputText = it },
                            placeholder = { Text("Ask a question...", color = TextSub) },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(24.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Accent,
                                unfocusedBorderColor = Border,
                                focusedTextColor = TextPrime,
                                unfocusedTextColor = TextPrime,
                                cursorColor = Accent,
                                focusedContainerColor = BgSurface,
                                unfocusedContainerColor = BgSurface
                            ),
                            maxLines = 4,
                            enabled = !isSending
                        )
                        Spacer(Modifier.width(12.dp))
                        FloatingActionButton(
                            onClick = {
                                if (inputText.isNotBlank()) {
                                    viewModel.sendMessage(inputText, null)
                                    inputText = ""
                                }
                            },
                            containerColor = Accent,
                            contentColor = Color(0xFF0F172A),
                            modifier = Modifier.size(56.dp),
                            shape = CircleShape
                        ) {
                            if (isSending && inputText.isBlank()) {
                                CircularProgressIndicator(Modifier.size(24.dp), color = Color(0xFF0F172A), strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Default.Send, null, modifier = Modifier.size(24.dp))
                            }
                        }
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            state = listState,
            contentPadding = PaddingValues(16.dp),
            modifier = Modifier.padding(padding).fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (messages.isEmpty()) {
                item {
                    Box(Modifier.fillParentMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.AutoAwesome, null, tint = Accent.copy(alpha = 0.5f), modifier = Modifier.size(64.dp))
                            Spacer(Modifier.height(16.dp))
                            Text("How can I help your career today?", color = TextSub, fontSize = 16.sp)
                        }
                    }
                }
            } else {
                items(messages, key = { it.id }) { msg ->
                    val isUser = msg.role == "user"
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        if (!isUser) {
                            Box(modifier = Modifier.size(32.dp).clip(CircleShape).background(Accent), contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.AutoAwesome, null, tint = BgDeep, modifier = Modifier.size(18.dp))
                            }
                            Spacer(Modifier.width(8.dp))
                        }
                        
                        Surface(
                            color = if (isUser) BgUser else BgAi,
                            shape = RoundedCornerShape(
                                topStart = 16.dp,
                                topEnd = 16.dp,
                                bottomStart = if (isUser) 16.dp else 4.dp,
                                bottomEnd = if (isUser) 4.dp else 16.dp
                            ),
                            modifier = Modifier.widthIn(max = 280.dp)
                        ) {
                            Column(Modifier.padding(14.dp)) {
                                if (!isUser && msg.isStreaming) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        CircularProgressIndicator(Modifier.size(12.dp), color = Accent, strokeWidth = 1.5.dp)
                                        Spacer(Modifier.width(8.dp))
                                        Text(if (msg.text.isEmpty()) "Thinking..." else msg.text, color = TextPrime, fontSize = 14.sp)
                                    }
                                } else {
                                    Text(msg.text, color = TextPrime, fontSize = 14.sp)
                                }
                                if (msg.isError) {
                                    Spacer(Modifier.height(4.dp))
                                    Text("Failed to send", color = Color(0xFFF85149), fontSize = 11.sp)
                                }
                            }
                        }
                        
                        if (!isUser) {
                            val context = androidx.compose.ui.platform.LocalContext.current
                            val clipboardManager = androidx.core.content.ContextCompat.getSystemService(context, android.content.ClipboardManager::class.java)
                            Spacer(Modifier.width(8.dp))
                            IconButton(
                                onClick = {
                                    val clip = android.content.ClipData.newPlainText("AI Response", msg.text)
                                    clipboardManager?.setPrimaryClip(clip)
                                },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(Icons.Default.Share, contentDescription = "Copy", tint = TextSub, modifier = Modifier.size(16.dp))
                            }
                        }
                        
                        if (isUser) {
                            Spacer(Modifier.width(8.dp))
                            Box(modifier = Modifier.size(32.dp).clip(CircleShape).background(BgSurface), contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Person, null, tint = TextSub, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
