package dev.resumeforge.app.ui.components
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun PrimaryButton(onClick: () -> Unit, modifier: Modifier = Modifier, text: String) {
    Button(onClick = onClick, modifier = modifier) {
        Text(text)
    }
}
