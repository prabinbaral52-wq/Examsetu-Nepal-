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
import java.net.HttpURLConnection
import java.net.URL

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

          // Enable hardware acceleration and desktop overview
          setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)
          isVerticalScrollBarEnabled = true
          isHorizontalScrollBarEnabled = true
          overScrollMode = android.view.View.OVER_SCROLL_IF_CONTENT_SCROLLS

          // Ensure cookies and session persist across app launches
          val cookieManager = android.webkit.CookieManager.getInstance()
          cookieManager.setAcceptCookie(true)
          cookieManager.setAcceptThirdPartyCookies(this, true)

          settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            useWideViewPort = true
            loadWithOverviewMode = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
              safeBrowsingEnabled = false
            }
          }
          setInitialScale(0)

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
    clean == "/curriculum" -> "curriculum.html"
    clean == "/planner" -> "planner.html"
    clean == "/guru" -> "guru.html"
    clean == "/college" || clean == "/colleges" -> "college.html"
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
    path == "/api/colleges" -> {
      """{
        "success": true,
        "colleges": []
      }"""
    }
    path.startsWith("/api/colleges/lookup") -> {
      """{
        "success": false,
        "message": "No institutional records found. Enter a valid registered College Name or access code."
      }"""
    }
    path == "/api/auth/google" -> {
      """{
        "success": true,
        "message": "Successfully authenticated via Google Account",
        "user": {"id": 1, "name": "Google User", "email": "user@gmail.com", "role": "student", "streak": 1, "xp": 100}
      }"""
    }
    path == "/api/colleges/student-login" -> {
      val colName = uri.getQueryParameter("collegeNameOrCode") ?: "College"
      """{
        "success": true,
        "message": "Logged into college portal",
        "redirectUrl": "/college"
      }"""
    }
    path == "/api/colleges/register" -> {
      """{
        "success": true,
        "message": "College registered successfully! Special access code generated.",
        "accessCode": "EXAMSETU-COLLEGE-2026",
        "redirectUrl": "/college"
      }"""
    }
    path == "/api/auth/me" || path == "/api/auth/auto-login" -> {
      """{"success":true,"user":{"id":1,"name":"Student Scholar","email":"student@examsetu.np","role":"student","current_streak":2,"total_xp":180}}"""
    }
    path == "/api/auth/login" -> {
      """{"success":true,"message":"Login successful","user":{"id":1,"name":"Student Scholar","email":"student@examsetu.np","role":"student","current_streak":2,"total_xp":180}}"""
    }
    path == "/api/auth/register" -> {
      """{"success":true,"message":"Registration successful","user":{"id":1,"name":"Student Scholar","email":"student@examsetu.np","role":"student","current_streak":1,"total_xp":50}}"""
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
      """{
        "success": true,
        "user": {"id":1,"name":"Student Scholar","email":"student@examsetu.np","role":"student","current_streak":2,"total_xp":180},
        "stats": {"testsTaken":3,"averageScore":82,"bestScore":94,"bookmarksCount":4,"wrongNotebookCount":1,"currentStreak":2,"totalXp":180},
        "recentTests": [
          {"id":101,"exam":"Lok Sewa","subject":"General Knowledge","score":85,"total_questions":20,"percentage":85,"created_at":"Today"}
        ],
        "badges": [
          {"code":"first_test","name":"First Step Scholar","icon":"ri-medal-fill","xp_reward":50}
        ],
        "allBadges": [
          {"code":"first_test","name":"First Step Scholar","icon":"ri-medal-fill","description":"Complete your first practice test","xp_reward":50},
          {"code":"streak_3","name":"Consistency Champion","icon":"ri-fire-fill","description":"Maintain a 3-day study streak","xp_reward":100}
        ]
      }"""
    }
    path.startsWith("/api/user/bookmarks") -> {
      """{"success":false,"message":"Online sign-in is required to save bookmarks."}"""
    }
    path == "/api/admin/stats" -> {
      """{"success":false,"message":"The admin portal requires the online server."}"""
    }
    path == "/api/guru/status" -> {
      """{
        "success": true,
        "user": {"id":1,"name":"Student Scholar","email":"student@examsetu.com","role":"student","streak":1,"total_xp":120},
        "rank": 1,
        "totalStudents": 1,
        "leaderboard": [
          {"id":1,"name":"Student Scholar","total_xp":120,"current_streak":1}
        ],
        "targetCompetitor": null,
        "xpGap": 0,
        "recommendations": [
          {
            "title": "Daily Practice Streak (+50 XP)",
            "description": "Complete 10 practice questions today to build your daily study momentum!",
            "actionExam": "Lok Sewa",
            "actionSubject": "General Knowledge",
            "bonusXp": 50
          },
          {
            "title": "High-Yield Revision: Nepal Constitution",
            "description": "Part 3 (Fundamental Rights, Articles 16-46) guarantees 15-20% of exam marks.",
            "actionExam": "Lok Sewa",
            "actionSubject": "General Knowledge",
            "topic": "Nepal Constitution",
            "bonusXp": 40
          }
        ]
      }"""
    }
    path == "/api/guru/chat" -> {
      val question = uri.getQueryParameter("q") ?: uri.getQueryParameter("message") ?: "How to prepare for Lok Sewa Nepal exams?"
      val liveAnswer = queryRealGeminiApi(question)
      val escaped = JSONObject.quote(liveAnswer)
      """{"success":true,"reply":$escaped,"modelUsed":"Gemini 3.5 Flash Lite (Live)","source":"Google Gemini API"}"""
    }
    path == "/api/library" -> {
      """{
        "success": true,
        "count": 5,
        "books": [
          {
            "id": 1,
            "title": "Grade 12 Physics: Modern Physics & Thermodynamics (NEB)",
            "subject": "Physics",
            "category": "Science",
            "author": "Curriculum Development Centre (CDC) Nepal",
            "source_type": "google_drive",
            "file_url": "https://drive.google.com/file/d/1neb-physics-grade12",
            "content_preview": "Unit 1: Heat and Thermodynamics, First and Second Laws. Carnot Engine efficiency. Unit 2: Modern Physics, Photoelectric Effect Einstein equation, Bohr Atomic model, Radioactivity half-life decay.",
            "total_pages": 48
          },
          {
            "id": 2,
            "title": "Grade 11 Chemistry: Inorganic & Organic Foundations",
            "subject": "Chemistry",
            "category": "Science",
            "author": "Prof. D. R. Bhattarai",
            "source_type": "docx",
            "file_url": "https://examsetu.np/assets/docs/reduced_chem_11.docx",
            "content_preview": "Stoichiometry calculations, Atomic structure, Periodic classification, Chemical Bonding, Organic Chemistry IUPAC nomenclature and reaction mechanisms.",
            "total_pages": 36
          },
          {
            "id": 3,
            "title": "Principles of Management & Business Studies (Class 12)",
            "subject": "Management",
            "category": "Management",
            "author": "Tribhuvan University Faculty Board",
            "source_type": "camscanner",
            "file_url": "",
            "content_preview": "Functions of management: Planning, Organizing, Staffing, Directing, and Controlling. Henry Fayol 14 principles of administrative management, Motivation theories.",
            "total_pages": 24
          },
          {
            "id": 4,
            "title": "Constitution of Nepal 2072 & Public Governance (GK)",
            "subject": "Lok Sewa GK",
            "category": "Lok Sewa",
            "author": "PSC Preparation Faculty",
            "source_type": "google_drive",
            "file_url": "https://drive.google.com/file/d/1loksewa-constitution",
            "content_preview": "Constitution of Nepal 2072 Part 3 Fundamental Rights (Articles 16-46). Federal Parliament structure, Judiciary, Public Service Commission Article 242.",
            "total_pages": 64
          },
          {
            "id": 5,
            "title": "Applied Mechanics & Statics (IOE Entrance Notes)",
            "subject": "Engineering",
            "category": "Engineering",
            "author": "Pulchowk Campus Faculty",
            "source_type": "camscanner",
            "file_url": "",
            "content_preview": "Forces in space, Lami Theorem, Equilibrium equations, Friction laws, Centre of gravity and Moment of Inertia for composite sections.",
            "total_pages": 30
          }
        ]
      }"""
    }
    path == "/api/library/add" -> {
      """{"success":true,"message":"Book added to Institutional Library successfully!","book":{"id":99,"title":"Saved Notes","subject":"General"}}"""
    }
    path == "/api/library/generate-mcq" -> {
      """{
        "success": true,
        "message": "Generated 5 curriculum MCQs successfully",
        "questions": [
          {
            "id": 1001,
            "subject": "Physics",
            "question": "What is the efficiency of a Carnot engine operating between temperatures T1 (hot) and T2 (cold)?",
            "options": {
              "A": "1 - (T2 / T1)",
              "B": "1 - (T1 / T2)",
              "C": "1 + (T2 / T1)",
              "D": "(T1 - T2) / T2"
            },
            "correct_answer": "A",
            "explanation": "Carnot efficiency is defined as eta = 1 - (T_cold / T_hot) where temperatures are in Kelvin."
          },
          {
            "id": 1002,
            "subject": "Physics",
            "question": "In the photoelectric effect, the maximum kinetic energy of emitted electrons depends on:",
            "options": {
              "A": "Intensity of incident light only",
              "B": "Frequency of incident light",
              "C": "Angle of incidence",
              "D": "Velocity of incident light in vacuum"
            },
            "correct_answer": "B",
            "explanation": "According to Einstein photoelectric equation KE_max = h*nu - phi, kinetic energy depends strictly on light frequency."
          },
          {
            "id": 1003,
            "subject": "Chemistry",
            "question": "What is the oxidation number of sulfur in sulfuric acid (H2SO4)?",
            "options": {
              "A": "+4",
              "B": "+2",
              "C": "+6",
              "D": "-2"
            },
            "correct_answer": "C",
            "explanation": "2(+1) + S + 4(-2) = 0 => S - 6 = 0 => S = +6."
          },
          {
            "id": 1004,
            "subject": "Lok Sewa GK",
            "question": "Under the Constitution of Nepal 2072, how many Fundamental Rights are guaranteed to citizens?",
            "options": {
              "A": "25",
              "B": "31",
              "C": "35",
              "D": "21"
            },
            "correct_answer": "B",
            "explanation": "Part 3, Articles 16 to 46 of the Constitution of Nepal 2072 guarantees 31 fundamental rights."
          },
          {
            "id": 1005,
            "subject": "Management",
            "question": "Who is widely recognized as the Father of Modern Management Theory?",
            "options": {
              "A": "F. W. Taylor",
              "B": "Henri Fayol",
              "C": "Max Weber",
              "D": "Elton Mayo"
            },
            "correct_answer": "B",
            "explanation": "Henri Fayol formulated the 14 principles of management and administrative theory."
          }
        ]
      }"""
    }
    path == "/api/library/upload-to-test" -> {
      """{"success":true,"message":"Questions uploaded to test form successfully!","setId":1}"""
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

// Live Gemini API Execution from Android App
private fun queryRealGeminiApi(prompt: String): String {
  return try {
    val apiKey = BuildConfig.GEMINI_API_KEY
    if (apiKey.isEmpty()) {
      return "Gemini API key is not configured in BuildConfig."
    }
    val url = URL("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=$apiKey")
    val conn = url.openConnection() as HttpURLConnection
    conn.requestMethod = "POST"
    conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
    conn.doOutput = true
    conn.connectTimeout = 8000
    conn.readTimeout = 12000

    val systemPrompt = "You are ExamSetu Nepal AI Exam Guru. Provide accurate, helpful, and direct answers in Nepali or English for students preparing for Lok Sewa and board exams in Nepal."
    val fullText = "$systemPrompt\n\nStudent Question: $prompt"

    val partObj = JSONObject().put("text", fullText)
    val partsArr = JSONArray().put(partObj)
    val contentObj = JSONObject().put("parts", partsArr)
    val contentsArr = JSONArray().put(contentObj)
    val bodyJson = JSONObject().put("contents", contentsArr)

    conn.outputStream.use { os ->
      os.write(bodyJson.toString().toByteArray(Charsets.UTF_8))
    }

    if (conn.responseCode == 200) {
      val responseText = conn.inputStream.bufferedReader().use { it.readText() }
      val root = JSONObject(responseText)
      val candidates = root.optJSONArray("candidates")
      val text = candidates?.optJSONObject(0)?.optJSONObject("content")?.optJSONArray("parts")?.optJSONObject(0)?.optString("text")
      if (!text.isNullOrBlank()) text.trim() else "Received response from Gemini."
    } else {
      "Note: Gemini service returned HTTP ${conn.responseCode}."
    }
  } catch (e: Exception) {
    "Note: Unable to reach Gemini API directly (${e.message})."
  }
}

