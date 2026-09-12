package com.networkpeer.mobile.core.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.json.JsonObject

@Serializable
data class ApiEnvelope<T>(
    val success: Boolean,
    val data: T? = null,
    val error: ApiError? = null,
)

@Serializable
data class ApiError(
    val code: String,
    val message: String,
)

class NetworkPeerApiException(
    val code: String,
    override val message: String,
    val statusCode: Int? = null,
) : IllegalStateException(message)

fun <T> ApiEnvelope<T>.requireData(): T =
    data.takeIf { success && it != null }
        ?: throw NetworkPeerApiException(error?.code ?: "REQUEST_FAILED", error?.message ?: "The request could not be completed")

@Serializable
enum class UserRole { CLIENT, WORKER, ADMIN }

@Serializable
enum class JobStatus {
    FUNDING,
    POSTED,
    ASSIGNED,
    EN_ROUTE,
    AT_LOCATION,
    IN_PROGRESS,
    SUBMITTED,
    APPROVED,
    COMPLETED,
    CANCELLED,
    DISPUTED,
}

@Serializable
enum class SubtaskStatus { PENDING, IN_PROGRESS, COMPLETED, SKIPPED }

@Serializable
enum class EscrowStatus { UNFUNDED, PENDING, HELD, RELEASED, FROZEN, REFUNDED }

@Serializable
enum class MediaType { IMAGE, VIDEO, AUDIO, DOCUMENT }

@Serializable
enum class MediaStatus { PENDING, UPLOADED, VERIFIED, REJECTED }

@Serializable
enum class PaymentOperationStatus { CREATED, PENDING, SUCCEEDED, FAILED, CANCELLED }

@Serializable
data class Point(
    val type: String = "Point",
    val coordinates: List<Double>,
) {
    init {
        require(coordinates.size == 2) { "A GeoJSON point needs [longitude, latitude]" }
    }

    companion object {
        fun fromLatitudeLongitude(latitude: Double, longitude: Double) = Point(coordinates = listOf(longitude, latitude))
    }
}

@Serializable
data class AuthUser(
    val id: String,
    val role: UserRole,
    val phone: String = "",
    val email: String? = null,
    @SerialName("full_name") val fullName: String = "",
    @SerialName("mobile_number") val mobileNumber: String? = null,
)

@Serializable
data class TokenPair(
    val access_token: String,
    val refresh_token: String,
    val expires_in: Long,
    val user: AuthUser,
)

@Serializable
data class StoredSession(
    val accessToken: String,
    val refreshToken: String,
    val expiresInSeconds: Long,
    val user: AuthUser,
) {
    companion object {
        fun from(pair: TokenPair) = StoredSession(
            accessToken = pair.access_token,
            refreshToken = pair.refresh_token,
            expiresInSeconds = pair.expires_in,
            user = pair.user,
        )
    }
}

@Serializable
data class OtpDelivery(
    val transport: String? = null,
    val to: String? = null,
)

@Serializable
data class OtpRequestResult(
    @SerialName("challenge_id") val challengeId: String = "",
    @SerialName("expires_in_seconds") val expiresInSeconds: Int = 300,
    @SerialName("otp_length") val otpLength: Int = 6,
    val delivery: OtpDelivery? = null,
    val otp: String? = null,
    val success: Boolean = true,
    val message: String = "",
)

@Serializable
data class Job(
    val id: String,
    val client_id: String,
    val worker_id: String? = null,
    val title: String,
    val description: String,
    val category: String,
    val status: JobStatus,
    val priority: Int,
    val budget_cents: Long,
    val platform_fee_cents: Long,
    val currency: String,
    val escrow_status: EscrowStatus,
    val funded_at: String? = null,
    val location: Point,
    val address: String? = null,
    val scheduled_at: String? = null,
    val started_at: String? = null,
    val completed_at: String? = null,
    val cancelled_at: String? = null,
    val cancellation_reason: String? = null,
    val metadata: JsonObject = JsonObject(emptyMap()),
    val created_at: String,
    val updated_at: String,
)

@Serializable
data class JobSubtask(
    val id: String,
    val job_id: String,
    val title: String,
    val description: String? = null,
    val sequence_order: Int,
    val is_required: Boolean,
    val status: SubtaskStatus,
    val completed_at: String? = null,
    val metadata: JsonObject = JsonObject(emptyMap()),
    val created_at: String,
    val updated_at: String,
)

@Serializable
data class WorkerJobSummary(
    val id: String,
    val title: String,
    val description: String,
    val category: String,
    val priority: Int,
    val budget_cents: Long,
    val currency: String,
    val scheduled_at: String? = null,
    val created_at: String,
    val distance_band: String,
    val capacity_mode: String? = null,
    val joined_workers: Int? = null,
)

@Serializable
data class WorkerJobDetail(
    val id: String,
    val title: String,
    val description: String,
    val category: String,
    val status: JobStatus,
    val priority: Int,
    val budget_cents: Long,
    val currency: String,
    val scheduled_at: String? = null,
    val created_at: String,
    val updated_at: String,
    val location: Point? = null,
    val address: String? = null,
    val is_assigned_to_requester: Boolean,
    val subtasks: List<JobSubtask>,
    val capacity_mode: String? = null,
    val joined_workers: Int? = null,
)


@Serializable
data class ClientJobDetail(
    val job: Job,
    val subtasks: List<JobSubtask>,
)

@Serializable
data class ClientJobPage(
    val items: List<Job>,
    val total: Int,
    val page: Int,
    val perPage: Int,
)

@Serializable
data class ClientJobCancellation(
    val job: Job,
    val cancelled: Boolean,
)

@Serializable
data class ClientJobResolution(
    val job: Job,
    val action: String,
)

@Serializable
data class EvidenceDownloadTarget(
    val url: String,
    val expires_at: String,
)

@Serializable
data class ClientEvidenceReviewItem(
    val id: String,
    val job_id: String,
    val subtask_id: String,
    val media_type: MediaType,
    val mime_type: String? = null,
    val file_size_bytes: Long? = null,
    val captured_at: String,
    val uploaded_at: String,
    val status: MediaStatus,
    val download: EvidenceDownloadTarget,
)

@Serializable
data class ClientEvidenceReviewResponse(val evidence: List<ClientEvidenceReviewItem>)

@Serializable
data class NearbyJobsPage(
    val items: List<WorkerJobSummary>,
    val page: Int,
    val perPage: Int,
    val radius_km: Int,
    val has_more: Boolean,
    val next_page: Int? = null,
)

@Serializable
data class WalletBalance(
    val currency: String,
    val availableBalanceCents: String,
    val pendingEscrowCents: String,
    val lifetimeEarningsCents: String,
    val lifetimeSpendCents: String,
)

@Serializable
data class WalletResponse(val balances: List<WalletBalance>)

@Serializable
data class FundingResult(
    val operationId: String,
    val ledgerTransactionId: String,
    val amountCents: String,
    val currency: String,
    val status: PaymentOperationStatus,
    val dispatchRequired: Boolean,
    val providerReference: String? = null,
    val clientSecret: String? = null,
)

@Serializable
data class ApprovalResult(
    val jobId: String,
    val status: JobStatus,
    val settlementLedgerTransactionId: String,
    val payoutOperationId: String,
    val payoutAmountCents: String,
    val currency: String,
    val payoutStatus: PaymentOperationStatus,
    val payoutProviderReference: String? = null,
    val payoutDispatchPending: Boolean,
)

@Serializable
data class EvidenceSummary(
    val id: String,
    val job_id: String,
    val subtask_id: String,
    val media_type: MediaType,
    val mime_type: String? = null,
    val file_size_bytes: Long? = null,
    val captured_at: String,
    val uploaded_at: String? = null,
    val status: MediaStatus,
)

@Serializable
data class EvidenceUploadTarget(
    val url: String,
    val fields: Map<String, String>,
    val expires_at: String,
)

@Serializable
data class EvidenceReservation(
    val evidence: EvidenceSummary,
    val upload: EvidenceUploadTarget? = null,
)

@Serializable
data class WorkStatusResult(
    val job_id: String,
    val status: JobStatus,
)

@Serializable
data class SubmitWorkResult(
    val job_id: String,
    val status: JobStatus,
)

@Serializable
data class SyncNotification(
    val id: String,
    val title: String,
    val body: String,
    val read_at: String? = null,
)

@Serializable
data class SyncEvent(
    val cursor: String,
    val event_id: String,
    val topic: String,
    val entity_type: String,
    val entity_id: String? = null,
    val payload: JsonObject = JsonObject(emptyMap()),
    val created_at: String,
    val notification: SyncNotification? = null,
)

@Serializable
data class SyncPage(
    val events: List<SyncEvent>,
    val has_more: Boolean,
    val next_cursor: String,
)

@Serializable
data class AppNotification(
    val id: String,
    val cursor: String,
    val topic: String,
    val title: String,
    val body: String,
    val data: JsonObject = JsonObject(emptyMap()),
    val read_at: String? = null,
    val created_at: String,
)

@Serializable
data class NotificationPage(
    val items: List<AppNotification>,
    val has_more: Boolean,
    val next_cursor: String? = null,
)

@Serializable
data class MarkAllNotificationsReadResult(val marked_count: Int)

@Serializable
data class WalletLedgerEntry(
    val id: String,
    val user_id: String,
    val job_id: String? = null,
    val transaction_type: String,
    val transaction_status: String,
    val amount_cents: Long,
    val balance_after_cents: Long,
    val currency: String,
    val reference_id: String? = null,
    val reference_type: String? = null,
    val description: String,
    val metadata: JsonObject = JsonObject(emptyMap()),
    val idempotency_key: String? = null,
    val processed_at: String? = null,
    val created_at: String,
)

@Serializable
data class WorkerSyncPage(
    val events: List<SyncEvent>,
    val jobs: List<WorkerJobDetail>,
    val snapshot_jobs: List<WorkerJobDetail>,
    val ledger_entries: List<WalletLedgerEntry>,
    val removed_job_ids: List<String>,
    val has_more: Boolean,
    val next_cursor: String,
)

@Serializable
data class DeviceRegistration(
    val id: String,
    val platform: String,
    val active: Boolean,
)

@Serializable
data class DeviceDeregistration(val deactivated: Boolean)

// Revision 2 Specification Models
@Serializable
enum class WorkerCapacityMode { single, capped, unlimited }

@Serializable
enum class WorkerRole { collectionist, correctionist }

@Serializable
data class JobCapacity(
    val mode: WorkerCapacityMode,
    val maxWorkers: Int? = null,
)

@Serializable
data class UnitOfWork(
    val kind: String,
    val totalUnits: Int? = null,
)

@Serializable
data class QualityMetric(
    val passed: Boolean,
    val score: Double,
    val message: String? = null,
)

@Serializable
data class QualityChecks(
    val edgeCoverage: QualityMetric,
    val sharpness: QualityMetric,
    val exposure: QualityMetric,
)

@Serializable
data class QualityCheckResult(
    val passed: Boolean,
    val checks: QualityChecks,
    val overallScore: Double,
    val engineVersion: String = "np-qa-v2",
    val ranOnDevice: Boolean = true,
    val checkedAt: String,
)

@Serializable
data class OCRResult(
    val text: String,
    val confidence: Double = 0.98,
    val engineVersion: String? = null,
    val modelName: String? = null,
    val language: String? = "hi+en",
    val detectedScript: String? = "bilingual", // "hindi", "english", "bilingual"
    val hindiText: String? = null,
    val englishText: String? = null,
    val generatedAt: String? = null,
) {
    val isHindiOnly: Boolean get() = detectedScript?.lowercase() == "hindi"
    val isEnglishOnly: Boolean get() = detectedScript?.lowercase() == "english"
    val isBilingual: Boolean get() = detectedScript?.lowercase() == "bilingual" || (hindiText != null && englishText != null)
    val scriptBadge: String get() = when (detectedScript?.lowercase()) {
        "hindi" -> "हिन्दी (Hindi - Devnagri)"
        "english" -> "English (Latin)"
        "bilingual" -> "Bilingual (हिन्दी + Eng)"
        else -> "OCR Text"
    }
}


@Serializable
data class ReviewEvent(
    val id: String,
    val submissionId: String,
    val reviewerRole: String,
    val reviewerId: String,
    val decision: String,
    val note: String? = null,
    val createdAt: String,
)

@Serializable
data class SubmissionItem(
    val id: String,
    val jobId: String,
    val assignmentId: String? = null,
    val workerId: String = "anonymized",
    val subtaskId: String? = null,
    val unitRef: String,
    val mediaUrl: String,
    val thumbnailUrl: String? = null,
    val ocrResult: OCRResult? = null,
    val ocrStatus: String = "ready",
    val ocrSnippet: String? = null,
    val qualityCheck: QualityCheckResult? = null,
    val status: String = "pending_review",
    val reviewHistory: List<ReviewEvent> = emptyList(),
    val submittedAt: String,
)

@Serializable
data class ReviewQueueResponse(
    val submissions: List<SubmissionItem>,
)

@Serializable
data class WorkerSubmissionsResponse(
    val submissions: List<SubmissionItem>,
)

@Serializable
data class WorkerProfileData(
    val skills: List<String> = emptyList(),
    val hourlyRateCents: Int? = null,
    val rating: Double = 0.0,
    val totalJobsCompleted: Int = 0,
    val verificationStatus: String = "PENDING",
    val preferredRadiusKm: Int = 50,
    val isAvailable: Boolean = true,
    @SerialName("eligible_roles") val eligibleRoles: List<String> = emptyList(),
)

@Serializable
data class UserProfile(
    val id: String = "",
    @SerialName("phone_number") val phoneNumberSnake: String? = null,
    val phoneNumber: String = "",
    val phone: String? = null,
    @SerialName("mobile_number") val mobileNumberSnake: String? = null,
    val mobileNumber: String? = null,
    @SerialName("full_name") val fullNameSnake: String? = null,
    val fullName: String = "",
    val email: String? = null,
    val role: UserRole = UserRole.WORKER,
    @SerialName("eligible_roles") val eligibleRolesList: List<String>? = null,
    val eligibleRoles: List<String> = emptyList(),
    @SerialName("avatar_url") val avatarUrlSnake: String? = null,
    val avatarUrl: String? = null,
    @SerialName("is_active") val isActiveSnake: Boolean? = null,
    val isActive: Boolean = true,
    @SerialName("is_verified") val isVerifiedSnake: Boolean? = null,
    val isVerified: Boolean = false,
    @SerialName("created_at") val createdAtSnake: String? = null,
    val createdAt: String? = null,
    @SerialName("worker_profile") val workerProfileSnake: WorkerProfileData? = null,
    val workerProfile: WorkerProfileData? = null,
) {
    val displayPhone: String
        get() = mobileNumber ?: phoneNumber.ifEmpty { phone ?: phoneNumberSnake ?: mobileNumberSnake ?: "" }
    val displayName: String
        get() = fullName.ifEmpty { fullNameSnake ?: "Verified User" }
    val roles: List<String>
        get() = if (eligibleRoles.isNotEmpty()) eligibleRoles else (eligibleRolesList ?: emptyList())
}

@Serializable
data class UpdateProfileBody(
    @SerialName("full_name") val fullName: String? = null,
    @SerialName("mobile_number") val mobileNumber: String? = null,
    val email: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val skills: List<String>? = null,
    @SerialName("preferred_radius_km") val preferredRadiusKm: Int? = null,
    @SerialName("is_available") val isAvailable: Boolean? = null,
)

fun Job.toWorkerJobSummary(): WorkerJobSummary = WorkerJobSummary(
    id = id,
    title = title,
    description = description,
    category = category,
    priority = priority,
    budget_cents = budget_cents,
    currency = currency,
    scheduled_at = scheduled_at,
    created_at = created_at,
    distance_band = "1_TO_5_KM",
)

val curatedWorkerJobs: List<WorkerJobSummary> = listOf(
    WorkerJobSummary(
        id = "job-np-2026-1",
        title = "Retail Storefront Bilingual Signage Audit",
        description = "Inspect physical retail storefront and capture clear signboard photo displaying Hindi (Devanagari) and English text. Verify GPS coordinates.",
        category = "PHYSICAL_AUDIT",
        priority = 1,
        budget_cents = 45000L,
        currency = "INR",
        created_at = "2026-09-12T10:00:00Z",
        distance_band = "0.8 KM · INDIRANAGAR",
        capacity_mode = "unlimited",
        joined_workers = 3,
    ),
    WorkerJobSummary(
        id = "job-np-2026-2",
        title = "Pharmacy License & Devanagari Board Verification",
        description = "Verify registered chemist counter license and store Hindi signboard using OCR scanner.",
        category = "COMPLIANCE",
        priority = 2,
        budget_cents = 65000L,
        currency = "INR",
        created_at = "2026-09-12T11:15:00Z",
        distance_band = "1.5 KM · KORAMANGALA",
        capacity_mode = "single",
        joined_workers = 0,
    ),
    WorkerJobSummary(
        id = "job-np-2026-3",
        title = "Warehouse Delivery Receipt & Stamped Invoice OCR",
        description = "Capture stamped physical dispatch challan and package barcode. Validate bilingual stamp verification in app.",
        category = "LOGISTICS",
        priority = 1,
        budget_cents = 85000L,
        currency = "INR",
        created_at = "2026-09-12T12:30:00Z",
        distance_band = "2.2 KM · HSR LAYOUT",
        capacity_mode = "single",
        joined_workers = 0,
    ),
    WorkerJobSummary(
        id = "job-np-2026-4",
        title = "Banking Kiosk & CSP Business Verification",
        description = "Confirm active banking Customer Service Point board with Hindi & English branding and capture biometric counter photo.",
        category = "FINANCIAL",
        priority = 2,
        budget_cents = 55000L,
        currency = "INR",
        created_at = "2026-09-12T13:45:00Z",
        distance_band = "3.1 KM · JAYANAGAR",
        capacity_mode = "unlimited",
        joined_workers = 2,
    ),
    WorkerJobSummary(
        id = "job-np-2026-5",
        title = "EV Charging Station Operational Status Check",
        description = "Inspect public EV charging connector ports, operational display screen in Hindi/English, and parking bay markings.",
        category = "INFRASTRUCTURE",
        priority = 1,
        budget_cents = 120000L,
        currency = "INR",
        created_at = "2026-09-12T14:00:00Z",
        distance_band = "4.5 KM · WHITEFIELD",
        capacity_mode = "single",
        joined_workers = 0,
    ),
)

fun getCuratedWorkerJobDetail(jobId: String): WorkerJobDetail {
    val summary = curatedWorkerJobs.firstOrNull { it.id == jobId } ?: curatedWorkerJobs.first()
    val addr = when (summary.id) {
        "job-np-2026-1" -> "100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038"
        "job-np-2026-2" -> "5th Block, Koramangala Industrial Layout, Bengaluru, Karnataka 560095"
        "job-np-2026-3" -> "27th Main Rd, Sector 1, HSR Layout, Bengaluru, Karnataka 560102"
        "job-np-2026-4" -> "11th Main Rd, 4th Block, Jayanagar, Bengaluru, Karnataka 560011"
        else -> "ITPB Main Rd, Whitefield, Bengaluru, Karnataka 560066"
    }
    return WorkerJobDetail(
        id = summary.id,
        title = summary.title,
        description = summary.description,
        category = summary.category,
        status = JobStatus.POSTED,
        priority = summary.priority,
        budget_cents = summary.budget_cents,
        currency = summary.currency,
        created_at = summary.created_at,
        updated_at = summary.created_at,
        address = addr,
        location = Point(coordinates = listOf(77.6412, 12.9716)),
        is_assigned_to_requester = false,
        capacity_mode = summary.capacity_mode,
        joined_workers = summary.joined_workers,
        subtasks = listOf(
            JobSubtask(
                id = "${summary.id}-st-1",
                job_id = summary.id,
                title = "Capture exterior signboard showing Hindi (Devanagari) and English text",
                description = "Align camera clearly on main signboard. OCR will extract and verify both Devanagari and Latin script text.",
                sequence_order = 1,
                is_required = true,
                status = SubtaskStatus.PENDING,
                created_at = summary.created_at,
                updated_at = summary.created_at,
            ),
            JobSubtask(
                id = "${summary.id}-st-2",
                job_id = summary.id,
                title = "Capture physical storefront entrance and geotag",
                description = "Ensure entrance door and operating schedule are visible with live GPS coordinates.",
                sequence_order = 2,
                is_required = true,
                status = SubtaskStatus.PENDING,
                created_at = summary.created_at,
                updated_at = summary.created_at,
            ),
            JobSubtask(
                id = "${summary.id}-st-3",
                job_id = summary.id,
                title = "Confirm surrounding landmark or street number",
                description = "Cross-verify adjacent building or street sign for peer correctionist audit.",
                sequence_order = 3,
                is_required = false,
                status = SubtaskStatus.PENDING,
                created_at = summary.created_at,
                updated_at = summary.created_at,
            ),
        ),
    )
}


