package dev.resumeforge.app.data.models

data class Resume(
    val id: Int,
    val user_id: Int,
    val title: String,
    val template_id: Int?,
    val content: ResumeContent?,
    val ats_score: Int?,
    val created_at: String,
    val updated_at: String
)

data class ResumeContent(
    val personal: PersonalInfo = PersonalInfo(),
    val summary: String = "",
    val experience: List<Experience> = emptyList(),
    val education: List<Education> = emptyList(),
    val skills: List<String> = emptyList(),
    val projects: List<Project> = emptyList(),
    val certifications: List<Certification> = emptyList(),
    val achievements: List<String> = emptyList()
)

data class PersonalInfo(
    val firstName: String = "",
    val lastName: String = "",
    val email: String = "",
    val phone: String = "",
    val location: String = "",
    val linkedin: String = "",
    val portfolio: String = ""
)

data class Experience(
    val id: String = "",
    val title: String = "",
    val company: String = "",
    val location: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val current: Boolean = false,
    val description: String = ""
)

data class Education(
    val id: String = "",
    val degree: String = "",
    val institution: String = "",
    val location: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val current: Boolean = false,
    val gpa: String = ""
)

data class Project(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val link: String = ""
)

data class Certification(
    val id: String = "",
    val name: String = "",
    val issuer: String = "",
    val date: String = "",
    val link: String = ""
)

data class CreateResumeRequest(
    val title: String,
    val templateId: Int?,
    val content: ResumeContent
)

data class GenericMessageResponse(val message: String)
