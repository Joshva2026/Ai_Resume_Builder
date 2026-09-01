package dev.resumeforge.app.ui.screens.templates

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

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
fun TemplatesScreen(onBack: () -> Unit) {
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
                            Text("Resume Templates", color = TextPrime, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            Spacer(Modifier.height(4.dp))
                            Text("Choose a style for your next application", color = TextSub, fontSize = 13.sp)
                        }
                    }
                    HorizontalDivider(color = Border, thickness = 1.dp)
                }
            }
        }
    ) { padding ->
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.padding(padding).fillMaxSize().background(BgDeep),
            contentPadding = PaddingValues(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            val templates = listOf(
                "Classic ATS" to "Optimized for robots",
                "Modern" to "Clean and vibrant",
                "Minimal" to "Less is more",
                "Technical" to "For engineers"
            )
            
            items(templates) { (name, desc) ->
                Card(
                    modifier = Modifier.fillMaxWidth().aspectRatio(0.7f),
                    colors = CardDefaults.cardColors(containerColor = BgCard),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(Modifier.fillMaxSize()) {
                        Box(Modifier.fillMaxWidth().weight(1f).background(BgSurface)) {
                            // Placeholder for template preview image
                            Box(Modifier.fillMaxSize().padding(16.dp).background(BgCard, RoundedCornerShape(4.dp)))
                        }
                        HorizontalDivider(color = Border, thickness = 1.dp)
                        Column(Modifier.padding(12.dp)) {
                            Text(name, color = TextPrime, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                            Text(desc, color = TextSub, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}
