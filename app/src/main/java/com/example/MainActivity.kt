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

  // Handle hardware / gesture back button smoothly
  BackHandler(enabled = canGoBack) {
    if (webViewInstance?.canGoBack() == true) {
      webViewInstance?.goBack()
    }
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

          // Enable hardware acceleration and eliminate scroll lag for 60fps
          setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)
          isVerticalScrollBarEnabled = false
          isHorizontalScrollBarEnabled = false
          overScrollMode = android.view.View.OVER_SCROLL_NEVER

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
            // Disable zoom delay (eliminates 300ms mobile touch delay)
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
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
              canGoBack = view?.canGoBack() ?: false
            }

            override fun onRenderProcessGone(view: WebView?, detail: android.webkit.RenderProcessGoneDetail?): Boolean {
              // Gracefully handle Chromium render process drops or restarts without crashing
              view?.loadUrl("file:///android_asset/web/index.html")
              return true
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
              val uri = request?.url ?: return false
              val path = uri.path ?: ""
              val query = if (uri.query != null) "?${uri.query}" else ""

              val targetFile = resolveHtmlRoute(path)
              if (targetFile != null) {
                view?.loadUrl("file:///android_asset/web/$targetFile$query")
                return true
              }

              // Keep local file navigation inside WebView
              if (uri.scheme == "file") {
                return false
              }

              return false
            }

            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
              val uri = request?.url ?: return null
              val path = uri.path ?: ""

              // 1. Intercept asset paths (css, fonts, js, data) when requested via root path
              if (!path.contains("/android_asset/") && (path.startsWith("/css/") || path.startsWith("/js/") || path.startsWith("/data/"))) {
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

              // 2. Intercept direct HTML routes to prevent ERR_FILE_NOT_FOUND or hangs
              if (!path.contains("/android_asset/") && !path.startsWith("/api/")) {
                val targetHtml = resolveHtmlRoute(path)
                if (targetHtml != null) {
                  return try {
                    WebResourceResponse("text/html", "UTF-8", context.assets.open("web/$targetHtml"))
                  } catch (e: Exception) {
                    null
                  }
                }
              }

              // 3. Intercept offline API requests for standalone Android operation
              if (path.startsWith("/api/")) {
                return handleLocalApiRequest(context, uri)
              }

              return super.shouldInterceptRequest(view, request)
            }
          }

          webChromeClient = object : WebChromeClient() {
            override fun onJsAlert(view: WebView?, url: String?, message: String?, result: android.webkit.JsResult?): Boolean {
              result?.confirm()
              return true
            }

            override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: android.webkit.JsResult?): Boolean {
              result?.confirm()
              return true
            }

            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
              android.util.Log.d("ExamSetu", "${consoleMessage?.message()} -- line ${consoleMessage?.lineNumber()} of ${consoleMessage?.sourceId()}")
              return true
            }
          }

          // Load local offline home page directly
          loadUrl("file:///android_asset/web/index.html")
          webViewInstance = this
        }
      },
      update = { webView ->
        webViewInstance = webView
        canGoBack = webView.canGoBack()
      }
    )
  }
}

// Maps any path or slug to corresponding local asset HTML file
private fun resolveHtmlRoute(rawPath: String): String? {
  val clean = rawPath.removeSuffix(".html").trimEnd('/')
  return when {
    clean == "" || clean == "/" || clean == "/index" -> "index.html"
    clean == "/exams" -> "exams.html"
    clean == "/subject" -> "subject.html"
    clean == "/practice" -> "practice.html"
    clean == "/test" -> "test.html"
    clean == "/result" -> "result.html"
    clean == "/login" -> "login.html"
    clean == "/register" -> "register.html"
    clean == "/dashboard" -> "dashboard.html"
    clean == "/admin" -> "admin.html"
    clean == "/guru" -> "guru.html"
    clean == "/about" || clean == "/legal/about" -> "legal/about.html"
    clean == "/contact" || clean == "/legal/contact" -> "legal/contact.html"
    clean == "/privacy" || clean == "/legal/privacy" -> "legal/privacy.html"
    clean == "/terms" || clean == "/legal/terms" -> "legal/terms.html"
    clean == "/disclaimer" || clean == "/legal/disclaimer" -> "legal/disclaimer.html"
    rawPath.endsWith(".html") && !rawPath.contains("android_asset") -> rawPath.removePrefix("/")
    else -> null
  }
}

// Offline API responder: only published question content is available without a server.
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
      """{"success":false,"user":null}"""
    }
    path == "/api/auth/login" -> {
      """{"success":false,"message":"Online sign-in is required. Connect the app to the ExamSetu server."}"""
    }
    path == "/api/auth/register" -> {
      """{"success":false,"message":"Online registration is required. Connect the app to the ExamSetu server."}"""
    }
    path == "/api/auth/logout" -> {
      """{"success":true,"message":"Logged out"}"""
    }
    path.startsWith("/api/practice/questions") -> {
      try {
        val stream: InputStream = context.assets.open("web/data/questions.json")
        val content = stream.bufferedReader().use { it.readText() }
        """{"success":true,"questions":$content}"""
      } catch (e: Exception) {
        """{"success":false,"message":"Error loading questions"}"""
      }
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
        """{"success":true,"test":{"exam":"Lok Sewa","subject":"General Knowledge","durationMinutes":15,"questions":$sanitizedArray}}"""
      } catch (e: Exception) {
        """{"success":false,"message":"Error loading local questions"}"""
      }
    }
    path.contains("/submit") || (path.contains("/tests/") && path.endsWith("/result")) -> {
      """{"success":false,"message":"Online submission is required to save attempts and results."}"""
    }
    path == "/api/user/dashboard" -> {
      """{"success":false,"message":"Online sign-in is required to view your dashboard."}"""
    }
    path.startsWith("/api/user/bookmarks") -> {
      """{"success":false,"message":"Online sign-in is required to save bookmarks."}"""
    }
    path == "/api/admin/stats" -> {
      """{"success":false,"message":"The admin portal requires the online server."}"""
    }
    else -> {
      """{"success":false,"message":"This feature requires a connection to the ExamSetu server."}"""
    }
  }

  return WebResourceResponse(
    "application/json",
    "UTF-8",
    ByteArrayInputStream(jsonResponse.toByteArray(Charsets.UTF_8))
  )
}
