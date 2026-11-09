package android.view

class Display {
    val supportedModes: Array<Mode> = emptyArray()
    val refreshRate: Float = 0f
    class Mode { val refreshRate: Float = 0f }
    companion object { const val DEFAULT_DISPLAY = 0 }
}
