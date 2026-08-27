package dev.resumeforge.app.ui.screens.resume

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResumeWizardScreen(viewModel: ResumeEditorViewModel, onComplete: () -> Unit) {
    val step by viewModel.currentStep.collectAsState()
    val saveState by viewModel.saveState.collectAsState()
    
    val totalSteps = 8
    
    Scaffold(
        bottomBar = {
            BottomAppBar {
                if (step > 1) {
                    TextButton(onClick = { viewModel.currentStep.value = step - 1 }) { Text("Back") }
                }
                Spacer(Modifier.weight(1f))
                if (step < totalSteps) { 
                    Button(onClick = { viewModel.currentStep.value = step + 1 }) { Text("Next") }
                } else {
                    Button(onClick = { viewModel.saveResume("My Android Resume", "classic") }) { 
                        if (saveState is SaveState.Saving) CircularProgressIndicator(modifier = Modifier.size(24.dp))
                        else Text("Save Resume")
                    }
                }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).padding(16.dp)) {
            Text("STEP $step OF $totalSteps", style = MaterialTheme.typography.labelMedium)
            Spacer(modifier = Modifier.height(16.dp))
            
            when (step) {
                1 -> PersonalStep()
                2 -> SummaryStep()
                3 -> EducationStep()
                4 -> ExperienceStep()
                5 -> SkillsStep()
                6 -> ProjectsStep()
                7 -> TemplatesStep()
                8 -> PreviewStep()
            }
            
            if (saveState is SaveState.Error) {
                Spacer(modifier = Modifier.height(16.dp))
                Text((saveState as SaveState.Error).message, color = MaterialTheme.colorScheme.error)
            }
            if (saveState is SaveState.Success) {
                LaunchedEffect(Unit) { onComplete() }
            }
        }
    }
}

@Composable
fun PersonalStep() {
    Text("Personal Information", style = MaterialTheme.typography.headlineSmall)
}
@Composable
fun SummaryStep() {
    Text("Summary", style = MaterialTheme.typography.headlineSmall)
}
@Composable
fun EducationStep() {
    Text("Education", style = MaterialTheme.typography.headlineSmall)
}
@Composable
fun ExperienceStep() {
    Text("Experience", style = MaterialTheme.typography.headlineSmall)
}
@Composable
fun SkillsStep() {
    Text("Skills", style = MaterialTheme.typography.headlineSmall)
}
@Composable
fun ProjectsStep() {
    Text("Projects, Certifications, Achievements", style = MaterialTheme.typography.headlineSmall)
}
@Composable
fun TemplatesStep() {
    Text("Template Selection", style = MaterialTheme.typography.headlineSmall)
}
@Composable
fun PreviewStep() {
    Text("Preview & Finalize", style = MaterialTheme.typography.headlineSmall)
    Text("Review your resume before saving.", style = MaterialTheme.typography.bodyMedium)
}
