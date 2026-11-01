package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

  @Test
  fun `read string from context`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("ExamSetu Nepal", appName)
  }

  @Test
  fun `verify web assets exist`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val indexHtml = context.assets.open("web/index.html")
    assert(indexHtml.available() > 0)
    indexHtml.close()
  }
}
