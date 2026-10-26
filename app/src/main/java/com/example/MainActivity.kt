package com.example

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.viewinterop.AndroidView
import com.example.ui.theme.MyApplicationTheme
import kotlinx.coroutines.delay
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.InputStream

class MainActivity : ComponentActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    setContent {
      MyApplicationTheme {
        Surface(
          modifier = Modifier.fillMaxSize(),
          color = MaterialTheme.colorScheme.background
        ) {
          ExamSetuAppView()
        }
      }
    }
  }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun ExamSetuAppView(modifier: Modifier = Modifier) {
  var webViewInstance by remember { mutableStateOf<WebView?>(null) }
  var canGoBack by remember { mutableStateOf(false) }
  var isLoading by remember { mutableStateOf(true) }

  // Timeout guard to ensure progress indicator always clears quickly
  LaunchedEffect(isLoading) {
    if (isLoading) {
      delay(600)
      isLoading = false
    }
  }

  // Handle hardware / gesture back button
  BackHandler(enabled = canGoBack) {
    webViewInstance?.goBack()
  }

  Box(
    modifier = modifier
      .fillMaxSize()
      .statusBarsPadding()
      .navigationBarsPadding()
      .background(Color(0xFFF8FAFC))
      .testTag("examsetu_webview_container")
  ) {
    AndroidView(
      modifier = Modifier
        .fillMaxSize()
        .testTag("examsetu_webview"),
      factory = { context ->
        WebView(context).apply {
          layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
          )

          settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            // Disable SafeBrowsing seed downloads which cause variations seed errors in container
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
              safeBrowsingEnabled = false
            }
          }

          webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
              super.onPageStarted(view, url, favicon)
              canGoBack = view?.canGoBack() ?: false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
              super.onPageFinished(view, url)
              isLoading = false
              canGoBack = view?.canGoBack() ?: false
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
              super.onReceivedError(view, request, error)
              isLoading = false
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
              val uri = request?.url ?: return false
              val path = uri.path ?: ""
              val query = if (uri.query != null) "?${uri.query}" else ""

              // Route mappings for seamless in-app navigation
              val targetFile = when (path) {
                "/", "" -> "index.html"
                "/exams" -> "exams.html"
                "/subject" -> "subject.html"
                "/test" -> "test.html"
                "/result" -> "result.html"
                "/login" -> "login.html"
                "/register" -> "register.html"
                "/dashboard" -> "dashboard.html"
                "/admin" -> "admin.html"
                "/about" -> "legal/about.html"
                "/contact" -> "legal/contact.html"
                "/privacy" -> "legal/privacy.html"
                "/terms" -> "legal/terms.html"
                "/disclaimer" -> "legal/disclaimer.html"
                else -> null
              }

              if (targetFile != null) {
                view?.loadUrl("file:///android_asset/web/$targetFile$query")
                return true
              }

              if (uri.scheme == "file") {
                return false
              }

              return false
            }

            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
              val uri = request?.url ?: return null
              val path = uri.path ?: ""

              // Intercept asset paths (css, fonts, js, data)
              if (path.startsWith("/css/") || path.startsWith("/js/") || path.startsWith("/data/")) {
                val cleanPath = path.substringBefore("?")
                val assetPath = "web" + cleanPath
                val mime = when {
                  cleanPath.endsWith(".css") -> "text/css"
                  cleanPath.endsWith(".js") -> "application/javascript"
                  cleanPath.endsWith(".json") -> "application/json"
                  cleanPath.endsWith(".woff2") -> "font/woff2"
                  cleanPath.endsWith(".woff") -> "font/woff"
                  cleanPath.endsWith(".ttf") -> "font/ttf"
                  cleanPath.endsWith(".svg") -> "image/svg+xml"
                  cleanPath.endsWith(".png") -> "image/png"
                  cleanPath.endsWith(".jpg") || cleanPath.endsWith(".jpeg") -> "image/jpeg"
                  else -> "text/plain"
                }
                return try {
                  WebResourceResponse(mime, "UTF-8", context.assets.open(assetPath))
                } catch (e: Exception) {
                  null
                }
              }

              // Intercept offline API requests for standalone Android operation
              if (path.startsWith("/api/")) {
                return handleLocalApiRequest(context, uri)
              }

              return super.shouldInterceptRequest(view, request)
            }
          }

          webChromeClient = WebChromeClient()

          // Load local offline home page
          loadUrl("file:///android_asset/web/index.html")
          webViewInstance = this
        }
      },
      update = { webView ->
        webViewInstance = webView
        canGoBack = webView.canGoBack()
      }
    )

    if (isLoading) {
      Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
      ) {
        CircularProgressIndicator(color = Color(0xFF2563EB))
      }
    }
  }
}

// Local mock API responder to provide instant standalone response in Android Emulator
private fun handleLocalApiRequest(context: Context, uri: Uri): WebResourceResponse {
  val path = uri.path ?: ""
  val jsonResponse: String = when {
    path == "/api/exams" -> {
      """{
        "success": true,
        "exams": [
          {"id":1,"name":"Lok Sewa","slug":"lok-sewa","description":"Civil Service Examination (Kharidar, Nayab Subba, Section Officer, Technical)","nepali_title":"लोक सेवा आयोग परीक्षा","icon":"ri-government-line","badge":"Most Popular"},
          {"id":2,"name":"SEE","slug":"see","description":"Secondary Education Examination (Class 10 - Mathematics, Science, English, Social)","nepali_title":"एसईई परीक्षा अभ्यास","icon":"ri-book-read-line","badge":"Class 10 Board"},
          {"id":3,"name":"NEB","slug":"neb","description":"National Examination Board (+2 Science, Management, Humanities, Social Studies)","nepali_title":"राष्ट्रिय परीक्षा बोर्ड (+२)","icon":"ri-graduation-cap-line","badge":"+2 Board"},
          {"id":4,"name":"Banking","slug":"banking","description":"Nepal Rastra Bank (NRB), Rastriya Banijya Bank (RBB), Agricultural Development Bank","nepali_title":"बैंकिङ परीक्षा तयारी","icon":"ri-bank-card-line","badge":"Banking Sector"},
          {"id":5,"name":"TSC","slug":"tsc","description":"Teachers Service Commission (Shikshak Sewa Aayog - Primary, Lower Secondary, Secondary)","nepali_title":"शिक्षक सेवा आयोग","icon":"ri-presentation-line","badge":"Teaching License"},
          {"id":6,"name":"Entrance","slug":"entrance","description":"Engineering (IOE), Medical (CEE), Management (CMAT, KUUMAT) Aptitude tests","nepali_title":"प्रवेश परीक्षा","icon":"ri-compass-3-line","badge":"Competitive"}
        ]
      }"""
    }
    path == "/api/auth/me" -> {
      """{"success":true,"user":{"id":2,"name":"Aayush Shrestha","email":"student@examsetu.com","role":"student"}}"""
    }
    path.startsWith("/api/tests/start") -> {
      try {
        val stream: InputStream = context.assets.open("web/data/questions.json")
        val content = stream.bufferedReader().use { it.readText() }
        val rawArray = JSONArray(content)
        val sanitizedArray = JSONArray()
        for (i in 0 until minOf(10, rawArray.length())) {
          val item = rawArray.getJSONObject(i)
          val qObj = JSONObject()
          qObj.put("id", item.getInt("id"))
          qObj.put("exam", item.getString("exam"))
          qObj.put("subject", item.getString("subject"))
          qObj.put("topic", item.optString("topic", "General"))
          qObj.put("question", item.getString("question"))
          qObj.put("options", item.getJSONObject("options"))
          sanitizedArray.put(qObj)
        }
        """{"success":true,"test":{"exam":"Lok Sewa","subject":"General Knowledge","durationMinutes":10,"questions":$sanitizedArray}}"""
      } catch (e: Exception) {
        """{"success":false,"message":"Error loading local questions"}"""
      }
    }
    path == "/api/user/dashboard" -> {
      """{
        "success": true,
        "user": {"id":2,"name":"Aayush Shrestha","email":"student@examsetu.com","role":"student"},
        "stats": {"testsTaken":3,"averageScore":82,"bestScore":90,"bookmarksCount":2},
        "recentTests": [
          {"id":1,"exam_name":"Lok Sewa","subject_name":"General Knowledge","percentage":90,"score":9,"total_questions":10,"time_taken_seconds":340,"created_at":"2026-10-25"},
          {"id":2,"exam_name":"SEE","subject_name":"Science","percentage":80,"score":8,"total_questions":10,"time_taken_seconds":410,"created_at":"2026-10-24"}
        ],
        "bookmarks": [
          {"id":1,"exam_name":"Lok Sewa","question":"According to the Constitution of Nepal (2072), how many fundamental rights are guaranteed to citizens?","correct_answer":"B"}
        ]
      }"""
    }
    path == "/api/admin/stats" -> {
      """{"success":true,"stats":{"totalQuestions":35,"totalAttempts":12,"totalUsers":24,"totalExams":6}}"""
    }
    else -> {
      """{"success":true,"message":"OK"}"""
    }
  }

  return WebResourceResponse(
    "application/json",
    "UTF-8",
    ByteArrayInputStream(jsonResponse.toByteArray(Charsets.UTF_8))
  )
}
