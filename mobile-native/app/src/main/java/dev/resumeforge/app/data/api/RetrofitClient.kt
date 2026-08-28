package dev.resumeforge.app.data.api

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Secure, persistent token storage backed by EncryptedSharedPreferences.
 * Must be initialised once via [TokenStore.init] (from Application or MainActivity)
 * before any Retrofit call that requires auth.
 */
object TokenStore {
    private const val PREFS_FILE = "resumeforge_secure_prefs"
    private const val KEY_ACCESS  = "access_token"
    private const val KEY_REFRESH = "refresh_token"

    private var prefs: android.content.SharedPreferences? = null

    /** Call once in MainActivity.onCreate before any network call. */
    fun init(context: Context) {
        if (prefs != null) return
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        prefs = EncryptedSharedPreferences.create(
            context,
            PREFS_FILE,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    var accessToken: String?
        get() = prefs?.getString(KEY_ACCESS, null)?.takeIf { it.isNotBlank() }
        set(value) {
            prefs?.edit()?.apply {
                if (value.isNullOrBlank()) remove(KEY_ACCESS)
                else putString(KEY_ACCESS, value)
                apply()
            }
        }

    var refreshToken: String?
        get() = prefs?.getString(KEY_REFRESH, null)?.takeIf { it.isNotBlank() }
        set(value) {
            prefs?.edit()?.apply {
                if (value.isNullOrBlank()) remove(KEY_REFRESH)
                else putString(KEY_REFRESH, value)
                apply()
            }
        }

    fun clearAll() {
        prefs?.edit()?.clear()?.apply()
    }

    fun hasValidToken(): Boolean = !accessToken.isNullOrBlank()
}

object RetrofitClient {
    private const val BASE_URL = "https://ai-resume-builder-rb1m.onrender.com" // Production Render backend

    // In-memory mirror kept in sync with TokenStore for interceptor access without disk I/O per request.
    // Populated on first call from TokenStore after init().
    private var _runtimeToken: String? = null

    /** Read-only access to whatever token is currently active (persisted > runtime). */
    val currentToken: String?
        get() = _runtimeToken ?: TokenStore.accessToken

    /**
     * Set both the runtime mirror and the persistent store.
     * Pass null or blank to clear.
     */
    fun setAuthToken(value: String?) {
        _runtimeToken = if (value.isNullOrBlank()) null else value
        TokenStore.accessToken = value
    }

    fun setRefreshToken(value: String?) {
        TokenStore.refreshToken = value
    }

    fun clearTokens() {
        _runtimeToken = null
        TokenStore.clearAll()
    }

    /** Restore session from persistent storage after app restart. */
    fun restoreSession() {
        _runtimeToken = TokenStore.accessToken
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(HttpLoggingInterceptor().apply {
            // BODY level logs are useful during development; switch to NONE for production builds.
            level = HttpLoggingInterceptor.Level.HEADERS
        })
        .addInterceptor { chain ->
            val token = currentToken
            val request = chain.request().newBuilder().apply {
                // Only inject header when a non-blank token is available.
                if (!token.isNullOrBlank()) {
                    addHeader("Authorization", "Bearer $token")
                }
            }.build()
            chain.proceed(request)
        }
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val apiService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
