package android.hardware.input

class InputManager {
    val inputDeviceIds: IntArray = intArrayOf()
    fun getInputDevice(id: Int): InputDevice? = null
}
class InputDevice { val isVirtual: Boolean = false }
