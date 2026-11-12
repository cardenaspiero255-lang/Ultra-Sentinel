package kotlinx.io.bytestring

public class ByteString internal constructor(
    private val bytes: ByteArray,
    private val start: Int,
    private val end: Int
) {
    public constructor() : this(byteArrayOf(), 0, 0)
    public val size: Int get() = end - start
    internal fun getBackingArrayReference(): ByteArray = bytes.copyOfRange(start, end)
    public companion object {
        public fun wrap(bytes: ByteArray): ByteString = ByteString(bytes, 0, bytes.size)
    }
}
