package com.zenith26.fest

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.*
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var prefs: SharedPreferences

    companion object {
        private const val PREFS_NAME = "zenith26_prefs"
        private const val KEY_BACKEND_URL = "backend_url"
        private const val DEFAULT_EMULATOR_URL = "http://10.0.2.2:8080"
        private const val DEFAULT_DEVICE_URL = "http://localhost:8080"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        setupWebView()
        setupBackNavigation()

        loadApplication()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // JavaScript interface for communication
        webView.addJavascriptInterface(AndroidBridge(this), "AndroidBridge")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
            }

            override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("Zenith '26")
                    .setMessage(message ?: "")
                    .setPositiveButton(android.R.string.ok) { _, _ -> result?.confirm() }
                    .setOnCancelListener { result?.cancel() }
                    .show()
                return true
            }

            override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("Zenith '26")
                    .setMessage(message ?: "")
                    .setPositiveButton(android.R.string.ok) { _, _ -> result?.confirm() }
                    .setNegativeButton(android.R.string.cancel) { _, _ -> result?.cancel() }
                    .setOnCancelListener { result?.cancel() }
                    .show()
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url ?: return false
                val backendUri = Uri.parse(getBackendUrl())

                // If currently viewing local file assets, translate root-relative navigation
                val currentLoadedUrl = view?.url ?: ""
                if (currentLoadedUrl.startsWith("file:///android_asset")) {
                    val path = url.path ?: ""
                    if (path == "/" || path == "/index.html" || path.endsWith("/index.html")) {
                        view?.loadUrl("file:///android_asset/frontend/index.html")
                        return true
                    }
                    if (path == "/admin.html" || path.endsWith("/admin.html")) {
                        view?.loadUrl("file:///android_asset/frontend/admin.html")
                        return true
                    }
                }

                // Keep same-origin and relative navigation within the WebView
                if (url.host == backendUri.host || url.scheme == "file") {
                    return false
                }
                return false
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    showConnectionErrorPage(view, error?.description?.toString() ?: "Network error")
                }
            }
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // If a modal is currently open in the web application, dismiss it first
                webView.evaluateJavascript(
                    "(function() { " +
                    "  var m = document.getElementById('event-modal'); " +
                    "  if (m && !m.classList.contains('hidden') && typeof closeModal === 'function') { " +
                    "    closeModal(); return true; " +
                    "  } " +
                    "  return false; " +
                    "})()"
                ) { result ->
                    if (result == "true") {
                        // Modal was dismissed
                        return@evaluateJavascript
                    }
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            }
        })
    }

    fun getBackendUrl(): String {
        val saved = prefs.getString(KEY_BACKEND_URL, null)
        if (!saved.isNullOrBlank()) {
            return saved.trimEnd('/')
        }
        return if (isEmulator()) {
            DEFAULT_EMULATOR_URL
        } else {
            DEFAULT_DEVICE_URL
        }
    }

    fun saveAndReloadBackendUrl(url: String) {
        val cleanUrl = url.trim().trimEnd('/')
        if (cleanUrl.isNotEmpty()) {
            prefs.edit().putString(KEY_BACKEND_URL, cleanUrl).apply()
            Toast.makeText(this, "Connecting to: $cleanUrl", Toast.LENGTH_SHORT).show()
            loadApplication()
        }
    }

    fun loadApplication() {
        val url = getBackendUrl()
        webView.loadUrl(url)
    }

    fun loadLocalAssets() {
        webView.loadUrl("file:///android_asset/frontend/index.html")
    }

    private fun isEmulator(): Boolean {
        return (Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || Build.HARDWARE.contains("goldfish")
                || Build.HARDWARE.contains("ranchu")
                || Build.PRODUCT.contains("sdk_gphone")
                || Build.PRODUCT.contains("sdk")
                || Build.PRODUCT.contains("vbox86p")
                || Build.PRODUCT.contains("emulator"))
    }

    private fun showConnectionErrorPage(view: WebView?, errorDescription: String) {
        val currentUrl = getBackendUrl()
        val errorHtml = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Connection Error | Zenith '26</title>
                <style>
                    body {
                        margin: 0;
                        padding: 24px;
                        background-color: #0f172a;
                        color: #f1f5f9;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 90vh;
                        box-sizing: border-box;
                    }
                    .card {
                        background: #1e293b;
                        border: 1px solid #334155;
                        border-radius: 16px;
                        padding: 28px;
                        max-width: 440px;
                        width: 100%;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
                    }
                    .icon {
                        font-size: 42px;
                        text-align: center;
                        margin-bottom: 12px;
                    }
                    h2 {
                        margin: 0 0 8px 0;
                        font-size: 20px;
                        font-weight: 800;
                        text-align: center;
                        color: #f8fafc;
                    }
                    .subtitle {
                        font-size: 13px;
                        color: #94a3b8;
                        text-align: center;
                        margin-bottom: 20px;
                        line-height: 1.4;
                    }
                    .info-box {
                        background: #0f172a;
                        border: 1px solid #334155;
                        border-radius: 10px;
                        padding: 12px;
                        font-size: 12px;
                        color: #cbd5e1;
                        margin-bottom: 20px;
                        line-height: 1.5;
                    }
                    .info-box strong { color: #a855f7; }
                    .form-group {
                        margin-bottom: 16px;
                    }
                    label {
                        display: block;
                        font-size: 12px;
                        font-weight: 600;
                        color: #94a3b8;
                        margin-bottom: 6px;
                    }
                    input[type="text"] {
                        width: 100%;
                        padding: 12px;
                        background: #0f172a;
                        border: 1px solid #475569;
                        border-radius: 8px;
                        color: #ffffff;
                        font-size: 14px;
                        box-sizing: border-box;
                    }
                    input[type="text"]:focus {
                        outline: none;
                        border-color: #a855f7;
                    }
                    .btn-primary {
                        width: 100%;
                        padding: 12px;
                        background: linear-gradient(135deg, #7c3aed, #a855f7);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 700;
                        cursor: pointer;
                        transition: opacity 0.2s;
                    }
                    .btn-secondary {
                        width: 100%;
                        padding: 10px;
                        background: transparent;
                        color: #94a3b8;
                        border: 1px solid #475569;
                        border-radius: 8px;
                        font-size: 13px;
                        margin-top: 8px;
                        cursor: pointer;
                    }
                    .btn-preset {
                        flex: 1;
                        padding: 8px 6px;
                        background: #1e293b;
                        color: #cbd5e1;
                        border: 1px solid #475569;
                        border-radius: 6px;
                        font-size: 11px;
                        font-weight: 600;
                        cursor: pointer;
                    }
                    .btn-preset:hover, .btn-preset:active {
                        background: #334155;
                        border-color: #a855f7;
                        color: #fff;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">⚡</div>
                    <h2>Zenith '26 Backend Offline</h2>
                    <p class="subtitle">Unable to connect to the FastAPI server at:<br><strong style="color:#c084fc;">$currentUrl</strong><br><span style="font-size:11px; color:#f87171;">($errorDescription)</span></p>
                    
                    <div class="info-box">
                        <strong>Troubleshooting Steps:</strong><br>
                        1. Start FastAPI: <code>uvicorn backend.main:app --host 0.0.0.0 --port 8080</code><br>
                        2. Android Emulator: uses <code>http://10.0.2.2:8080</code><br>
                        3. Physical Device USB: run <code>adb reverse tcp:8080 tcp:8080</code><br>
                        4. Physical Device Wi-Fi: enter your computer's LAN IP
                    </div>

                    <form id="urlForm" onsubmit="event.preventDefault(); submitUrl();">
                        <div class="form-group">
                            <label for="serverUrl">Backend Server Address</label>
                            <input type="text" id="serverUrl" value="$currentUrl" placeholder="http://10.0.2.2:8080">
                        </div>
                        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                            <button type="button" class="btn-preset" onclick="setPreset('http://10.0.2.2:8080')">📱 Emulator</button>
                            <button type="button" class="btn-preset" onclick="setPreset('http://localhost:8080')">🔌 USB (Reverse)</button>
                        </div>
                        <button type="submit" class="btn-primary">Connect &amp; Retry</button>
                        <button type="button" class="btn-secondary" onclick="useLocalAssets()">View Local Assets (Offline Preview)</button>
                    </form>
                </div>

                <script>
                    function setPreset(val) {
                        document.getElementById('serverUrl').value = val;
                        submitUrl();
                    }
                    function submitUrl() {
                        var val = document.getElementById('serverUrl').value.trim();
                        if (val && window.AndroidBridge) {
                            window.AndroidBridge.updateBackendUrl(val);
                        } else {
                            window.location.href = val;
                        }
                    }
                    function useLocalAssets() {
                        if (window.AndroidBridge) {
                            window.AndroidBridge.loadLocalAssets();
                        }
                    }
                </script>
            </body>
            </html>
        """.trimIndent()

        view?.loadDataWithBaseURL(null, errorHtml, "text/html", "UTF-8", null)
    }

    fun showServerSettingsDialog() {
        val input = EditText(this)
        input.setText(getBackendUrl())
        input.setSelection(input.text.length)
        input.hint = "http://10.0.2.2:8080"

        AlertDialog.Builder(this)
            .setTitle(R.string.server_settings_title)
            .setMessage("Set the FastAPI backend address (Emulator: 10.0.2.2:8080, Physical: LAN IP or localhost:8080)")
            .setView(input)
            .setPositiveButton(R.string.server_settings_save) { _, _ ->
                val newUrl = input.text.toString().trim()
                saveAndReloadBackendUrl(newUrl)
            }
            .setNeutralButton("Emulator Default") { _, _ ->
                saveAndReloadBackendUrl(DEFAULT_EMULATOR_URL)
            }
            .setNegativeButton(R.string.server_settings_cancel, null)
            .show()
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            showServerSettingsDialog()
            return true
        }
        return super.onKeyUp(keyCode, event)
    }

    override fun onKeyLongPress(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            showServerSettingsDialog()
            return true
        }
        return super.onKeyLongPress(keyCode, event)
    }

    class AndroidBridge(private val activity: MainActivity) {
        @JavascriptInterface
        fun updateBackendUrl(url: String) {
            activity.runOnUiThread {
                activity.saveAndReloadBackendUrl(url)
            }
        }

        @JavascriptInterface
        fun getBackendUrl(): String {
            return activity.getBackendUrl()
        }

        @JavascriptInterface
        fun loadLocalAssets() {
            activity.runOnUiThread {
                activity.loadLocalAssets()
            }
        }

        @JavascriptInterface
        fun openSettings() {
            activity.runOnUiThread {
                activity.showServerSettingsDialog()
            }
        }

        @JavascriptInterface
        fun showToast(message: String) {
            activity.runOnUiThread {
                Toast.makeText(activity, message, Toast.LENGTH_SHORT).show()
            }
        }
    }
}
