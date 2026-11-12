package kotlinx.io.bytestring.unsafe

import kotlinx.io.bytestring.ByteString

@RequiresOptIn(level = RequiresOptIn.Level.WARNING)
@Retention(AnnotationRetention.BINARY)
public annotation class UnsafeByteStringApi

public object UnsafeByteStringOperations {
    @UnsafeByteStringApi
    public fun wrapUnsafe(bytes: ByteArray): ByteString = ByteString.wrap(bytes)
}
