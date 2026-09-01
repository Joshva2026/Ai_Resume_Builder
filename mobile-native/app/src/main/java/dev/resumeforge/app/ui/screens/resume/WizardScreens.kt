package dev.resumeforge.app.ui.screens.resume

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.resumeforge.app.data.models.*

// ── Design tokens ─────────────────────────────────────────────────────────────
private val BgDeep    = Color(0xFF0F172A)
private val BgSurface = Color(0xFF1E293B)
private val BgCard    = Color(0xFF1E293B)
private val Accent    = Color(0xFF10B981)
private val TextPrime = Color.White
private val TextSub   = Color(0xFF94A3B8)
private val Border    = Color(0xFF334155)
private val Danger    = Color(0xFFEF4444)

private val TOTAL_STEPS = 7

// Step labels
private val STEP_LABELS = listOf(
    "Personal Info", "Summary", "Education",
    "Experience", "Skills", "Projects", "Save"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResumeWizardScreen(
    viewModel: ResumeEditorViewModel,
    onComplete: () -> Unit,
    onBack: () -> Unit
) {
    val step      by viewModel.currentStep.collectAsState()
    val saveState by viewModel.saveState.collectAsState()
    val content   by viewModel.content.collectAsState()

    // Local mutable copy of ResumeContent fields that the user edits.
    // Nothing is sent to the API until "Save Resume" is tapped on step 7.
    var personal  by remember { mutableStateOf(content.personal) }
    var summary   by remember { mutableStateOf(content.summary) }
    var education by remember { mutableStateOf(content.education.toMutableList()) }
    var experience by remember { mutableStateOf(content.experience.toMutableList()) }
    var skillsText by remember { mutableStateOf(content.skills.joinToString(", ")) }
    var projects  by remember { mutableStateOf(content.projects.toMutableList()) }
    var titleText by remember { mutableStateOf("My Resume") }
    var templateId by remember { mutableStateOf(1) }

    LaunchedEffect(saveState) {
        if (saveState is SaveState.Success) onComplete()
    }

    Scaffold(
        containerColor = BgDeep,
        topBar = {
            Surface(color = BgDeep, tonalElevation = 0.dp) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = {
                            if (step > 1) viewModel.currentStep.value = step - 1 else onBack()
                        }) {
                            Icon(Icons.Default.ArrowBack, "Back", tint = TextPrime)
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Step $step of $TOTAL_STEPS  ·  ${STEP_LABELS.getOrNull(step - 1) ?: ""}",
                                color = TextSub, fontSize = 12.sp
                            )
                            Text("Resume Builder", color = TextPrime, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        }
                    }
                    // Progress bar
                    LinearProgressIndicator(
                        progress = { step.toFloat() / TOTAL_STEPS },
                        modifier = Modifier.fillMaxWidth().height(2.dp),
                        color = Accent,
                        trackColor = Border
                    )
                }
            }
        },
        bottomBar = {
            Surface(color = BgDeep, tonalElevation = 0.dp) {
                Column {
                    HorizontalDivider(color = Border, thickness = 1.dp)
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        if (step > 1) {
                            OutlinedButton(
                                onClick = { viewModel.currentStep.value = step - 1 },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrime),
                                border = ButtonDefaults.outlinedButtonBorder
                            ) { Text("Back") }
                        }
                        if (step < TOTAL_STEPS) {
                            Button(
                                onClick = {
                                    // Sync local state into viewModel before advancing
                                    syncToViewModel(viewModel, personal, summary, education, experience, skillsText, projects)
                                    viewModel.currentStep.value = step + 1
                                },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = Accent),
                                shape = RoundedCornerShape(10.dp)
                            ) { Text("Next", color = BgDeep, fontWeight = FontWeight.SemiBold) }
                        } else {
                            // Final step — explicit Save Resume
                            Button(
                                onClick = {
                                    syncToViewModel(viewModel, personal, summary, education, experience, skillsText, projects)
                                    viewModel.saveResume(titleText, templateId)
                                },
                                modifier = Modifier.weight(1f),
                                enabled = saveState !is SaveState.Saving,
                                colors = ButtonDefaults.buttonColors(containerColor = Accent),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                if (saveState is SaveState.Saving) {
                                    CircularProgressIndicator(Modifier.size(20.dp), color = BgDeep, strokeWidth = 2.dp)
                                } else {
                                    Text("Save Resume", color = BgDeep, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    if (saveState is SaveState.Error) {
                        Text(
                            (saveState as SaveState.Error).message,
                            color = Danger,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 8.dp)
                        )
                    }
                }
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize().background(BgDeep)) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp)
            ) {
                when (step) {
                    1 -> PersonalInfoStep(personal)     { personal = it }
                    2 -> SummaryStep(summary)            { summary = it }
                    3 -> EducationStep(education)        { education = it.toMutableList() }
                    4 -> ExperienceStep(experience)      { experience = it.toMutableList() }
                    5 -> SkillsStep(skillsText)          { skillsText = it }
                    6 -> ProjectsStep(projects)          { projects = it.toMutableList() }
                    7 -> FinalStep(titleText, templateId ?: 1, { titleText = it }, { templateId = it })
                }
            }
        }
    }
}

private fun syncToViewModel(
    viewModel: ResumeEditorViewModel,
    personal: PersonalInfo,
    summary: String,
    education: List<Education>,
    experience: List<Experience>,
    skillsText: String,
    projects: List<Project>
) {
    val skills = skillsText.split(",").map { it.trim() }.filter { it.isNotBlank() }
    viewModel.updateContent(
        ResumeContent(
            personal    = personal,
            summary     = summary,
            education   = education,
            experience  = experience,
            skills      = skills,
            projects    = projects
        )
    )
}

// ─── Step 1: Personal Information ─────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PersonalInfoStep(info: PersonalInfo, onUpdate: (PersonalInfo) -> Unit) {
    StepHeader("Personal Information", "Your basic contact details")
    Spacer(Modifier.height(16.dp))

    WizardField("First Name", info.firstName) { onUpdate(info.copy(firstName = it)) }
    WizardField("Last Name",  info.lastName)  { onUpdate(info.copy(lastName = it)) }
    WizardField("Email",      info.email)     { onUpdate(info.copy(email = it)) }
    WizardField("Phone",      info.phone)     { onUpdate(info.copy(phone = it)) }
    WizardField("Location",   info.location)  { onUpdate(info.copy(location = it)) }
    WizardField("LinkedIn",   info.linkedin)  { onUpdate(info.copy(linkedin = it)) }
    WizardField("Portfolio",  info.portfolio) { onUpdate(info.copy(portfolio = it)) }
}

// ─── Step 2: Summary ──────────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SummaryStep(summary: String, onUpdate: (String) -> Unit) {
    StepHeader("Professional Summary", "A brief overview of your career goals and strengths")
    Spacer(Modifier.height(16.dp))
    OutlinedTextField(
        value = summary,
        onValueChange = onUpdate,
        modifier = Modifier.fillMaxWidth().heightIn(min = 140.dp),
        label = { Text("Summary", color = TextSub) },
        placeholder = { Text("e.g. Passionate software engineer with 3 years of experience…", color = TextSub.copy(alpha = 0.6f)) },
        colors = rfFieldColors(),
        minLines = 5
    )
}

// ─── Step 3: Education ────────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EducationStep(list: List<Education>, onUpdate: (List<Education>) -> Unit) {
    StepHeader("Education", "Your academic background")
    Spacer(Modifier.height(16.dp))

    list.forEachIndexed { i, edu ->
        Card(colors = CardDefaults.cardColors(containerColor = BgCard), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp)) {
                Text("Education ${i + 1}", color = Accent, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                WizardField("Degree",      edu.degree,      { onUpdate(list.toMutableList().also { l -> l[i] = edu.copy(degree = it) }) })
                WizardField("Institution", edu.institution, { onUpdate(list.toMutableList().also { l -> l[i] = edu.copy(institution = it) }) })
                WizardField("Location",    edu.location,    { onUpdate(list.toMutableList().also { l -> l[i] = edu.copy(location = it) }) })
                WizardField("Start Date",  edu.startDate,   { onUpdate(list.toMutableList().also { l -> l[i] = edu.copy(startDate = it) }) })
                WizardField("End Date",    edu.endDate,     { onUpdate(list.toMutableList().also { l -> l[i] = edu.copy(endDate = it) }) })
                WizardField("GPA",         edu.gpa,         { onUpdate(list.toMutableList().also { l -> l[i] = edu.copy(gpa = it) }) })
                Spacer(Modifier.height(4.dp))
                TextButton(onClick = { onUpdate(list.toMutableList().also { l -> l.removeAt(i) }) }) {
                    Text("Remove", color = Danger, fontSize = 13.sp)
                }
            }
        }
        Spacer(Modifier.height(10.dp))
    }

    OutlinedButton(
        onClick = { onUpdate(list + Education()) },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Accent),
        border = ButtonDefaults.outlinedButtonBorder
    ) { Text("+ Add Education") }
}

// ─── Step 4: Experience ───────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExperienceStep(list: List<Experience>, onUpdate: (List<Experience>) -> Unit) {
    StepHeader("Work Experience", "Your professional history")
    Spacer(Modifier.height(16.dp))

    list.forEachIndexed { i, exp ->
        Card(colors = CardDefaults.cardColors(containerColor = BgCard), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp)) {
                Text("Experience ${i + 1}", color = Accent, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                WizardField("Job Title",   exp.title,       { onUpdate(list.toMutableList().also { l -> l[i] = exp.copy(title = it) }) })
                WizardField("Company",     exp.company,     { onUpdate(list.toMutableList().also { l -> l[i] = exp.copy(company = it) }) })
                WizardField("Location",    exp.location,    { onUpdate(list.toMutableList().also { l -> l[i] = exp.copy(location = it) }) })
                WizardField("Start Date",  exp.startDate,   { onUpdate(list.toMutableList().also { l -> l[i] = exp.copy(startDate = it) }) })
                WizardField("End Date",    exp.endDate,     { onUpdate(list.toMutableList().also { l -> l[i] = exp.copy(endDate = it) }) })
                OutlinedTextField(
                    value = exp.description,
                    onValueChange = { v -> onUpdate(list.toMutableList().also { l -> l[i] = exp.copy(description = v) }) },
                    label = { Text("Description", color = TextSub) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = rfFieldColors(),
                    minLines = 3
                )
                Spacer(Modifier.height(4.dp))
                TextButton(onClick = { onUpdate(list.toMutableList().also { l -> l.removeAt(i) }) }) {
                    Text("Remove", color = Danger, fontSize = 13.sp)
                }
            }
        }
        Spacer(Modifier.height(10.dp))
    }

    OutlinedButton(
        onClick = { onUpdate(list + Experience()) },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Accent),
        border = ButtonDefaults.outlinedButtonBorder
    ) { Text("+ Add Experience") }
}

// ─── Step 5: Skills ───────────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SkillsStep(skillsText: String, onUpdate: (String) -> Unit) {
    StepHeader("Skills", "List your technical and soft skills")
    Spacer(Modifier.height(16.dp))
    OutlinedTextField(
        value = skillsText,
        onValueChange = onUpdate,
        modifier = Modifier.fillMaxWidth().heightIn(min = 120.dp),
        label = { Text("Skills (comma-separated)", color = TextSub) },
        placeholder = { Text("e.g. Kotlin, Android, Jetpack Compose, REST APIs", color = TextSub.copy(alpha = 0.6f)) },
        colors = rfFieldColors(),
        minLines = 4
    )
    Spacer(Modifier.height(8.dp))
    Text("Separate skills with commas", color = TextSub, fontSize = 12.sp)
}

// ─── Step 6: Projects ─────────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectsStep(list: List<Project>, onUpdate: (List<Project>) -> Unit) {
    StepHeader("Projects", "Showcase your key projects")
    Spacer(Modifier.height(16.dp))

    list.forEachIndexed { i, proj ->
        Card(colors = CardDefaults.cardColors(containerColor = BgCard), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp)) {
                Text("Project ${i + 1}", color = Accent, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                WizardField("Project Name", proj.name,        { onUpdate(list.toMutableList().also { l -> l[i] = proj.copy(name = it) }) })
                WizardField("Description",  proj.description, { onUpdate(list.toMutableList().also { l -> l[i] = proj.copy(description = it) }) })
                WizardField("Link (URL)",   proj.link,        { onUpdate(list.toMutableList().also { l -> l[i] = proj.copy(link = it) }) })
                Spacer(Modifier.height(4.dp))
                TextButton(onClick = { onUpdate(list.toMutableList().also { l -> l.removeAt(i) }) }) {
                    Text("Remove", color = Danger, fontSize = 13.sp)
                }
            }
        }
        Spacer(Modifier.height(10.dp))
    }

    OutlinedButton(
        onClick = { onUpdate(list + Project()) },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Accent),
        border = ButtonDefaults.outlinedButtonBorder
    ) { Text("+ Add Project") }
}

// ─── Step 7: Final — title, template, save ───────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinalStep(
    title: String,
    templateId: Int,
    onTitleChange: (String) -> Unit,
    onTemplateChange: (Int) -> Unit
) {
    StepHeader("Review & Save", "Name your resume and choose a template")
    Spacer(Modifier.height(16.dp))

    OutlinedTextField(
        value = title,
        onValueChange = onTitleChange,
        label = { Text("Resume Title", color = TextSub) },
        modifier = Modifier.fillMaxWidth(),
        colors = rfFieldColors(),
        singleLine = true
    )

    Spacer(Modifier.height(20.dp))
    Text("Template", color = TextSub, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    Spacer(Modifier.height(10.dp))

    val templates = listOf(1 to "Classic ATS", 2 to "Modern", 3 to "Minimal", 4 to "Technical")
    templates.forEach { (id, name) ->
        val selected = templateId == id
        Card(
            onClick = { onTemplateChange(id) },
            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
            colors = CardDefaults.cardColors(containerColor = if (selected) Accent.copy(alpha = 0.12f) else BgCard),
            shape = RoundedCornerShape(10.dp),
            border = if (selected) CardDefaults.outlinedCardBorder() else null
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(name, color = if (selected) Accent else TextPrime, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal)
                if (selected) {
                    Surface(color = Accent, shape = RoundedCornerShape(4.dp)) {
                        Text("Selected", color = BgDeep, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                    }
                }
            }
        }
    }

    Spacer(Modifier.height(16.dp))
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1C2D22)),
        shape = RoundedCornerShape(10.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            Text("Ready to save?", color = Accent, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Spacer(Modifier.height(4.dp))
            Text(
                "Your resume will be saved to your account. You can edit it anytime from the Resumes screen.",
                color = TextSub, fontSize = 13.sp
            )
        }
    }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
@Composable
private fun StepHeader(title: String, subtitle: String) {
    Text(title, color = TextPrime, fontWeight = FontWeight.Bold, fontSize = 20.sp)
    Spacer(Modifier.height(4.dp))
    Text(subtitle, color = TextSub, fontSize = 13.sp)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WizardField(label: String, value: String, onValueChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = TextSub) },
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = rfFieldColors(),
        singleLine = true
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun rfFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor   = Accent,
    unfocusedBorderColor = Border,
    focusedTextColor     = TextPrime,
    unfocusedTextColor   = TextPrime,
    cursorColor          = Accent,
    focusedContainerColor = BgSurface,
    unfocusedContainerColor = BgSurface
)
