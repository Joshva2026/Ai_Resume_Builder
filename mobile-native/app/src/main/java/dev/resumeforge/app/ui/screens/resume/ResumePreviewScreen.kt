package dev.resumeforge.app.ui.screens.resume

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val BgDeep    = Color(0xFF0F172A)
private val TextPrime = Color.White
private val TextSub   = Color(0xFF94A3B8)
private val Border    = Color(0xFF334155)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResumePreviewScreen(viewModel: ResumeEditorViewModel, onBack: () -> Unit) {
    val content by viewModel.content.collectAsState()
    
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
                        Column {
                            Text("Resume Preview", color = TextPrime, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            Spacer(Modifier.height(4.dp))
                            Text("A4 Document Preview", color = TextSub, fontSize = 13.sp)
                        }
                    }
                    HorizontalDivider(color = Border, thickness = 1.dp)
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier.padding(padding).fillMaxSize().background(BgDeep),
            contentAlignment = Alignment.Center
        ) {
            // A4 Aspect Ratio preview placeholder for now (1:1.414)
            Card(
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .aspectRatio(0.707f)
                    .padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState())
                ) {
                    Text("${content.personal.firstName} ${content.personal.lastName}", color = Color.Black, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text(content.personal.email, color = Color.DarkGray, fontSize = 12.sp)
                    Spacer(Modifier.height(16.dp))
                    Text(content.summary, color = Color.Black, fontSize = 12.sp)
                    Spacer(Modifier.height(16.dp))
                    Text("EDUCATION", color = Color.Black, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    content.education.forEach { edu ->
                        Text("${edu.degree} - ${edu.institution}", color = Color.Black, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
