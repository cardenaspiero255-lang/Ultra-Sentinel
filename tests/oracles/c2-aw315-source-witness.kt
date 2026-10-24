package net.activitywatch.android

import java.net.ServerSocket
import java.security.Permission

// Development witness only. The tested method is compiled verbatim from
// pinned ActivityWatch #315 upstream sources, with a trusted minimal ABI.
// Java 21 SecurityManager denial is a distinct permission-denial witness,
// NOT the exact GrapheneOS SocketException/EACCES platform environment.
@Suppress("DEPRECATION")
private class DenyListen : SecurityManager() {
    override fun checkPermission(perm: Permission) {}
    override fun checkListen(port: Int) {
        throw SecurityException("Synthetic permission denial at socket bind")
    }
}

object C2Aw315SourceWitness {
    @JvmStatic fun main(args: Array<String>) {
        require(args.size == 1 && args[0] in listOf("original", "fixed"))
        val expectEscape = args[0] == "original"
        @Suppress("DEPRECATION")
        val prior = System.getSecurityManager()
        try {
            @Suppress("DEPRECATION")
            System.setSecurityManager(DenyListen())
            RustInterface.serverStarted = false
            var escaped = false
            try {
                RustInterface().startServerTask()
            } catch (e: SecurityException) {
                escaped = true
            }
            check(escaped == expectEscape) { "Permission-denied outcome diverged" }
            check(!RustInterface.serverStarted) { "Server incorrectly marked started" }
        } finally {
            @Suppress("DEPRECATION")
            System.setSecurityManager(prior)
        }
        println(if (expectEscape) "C2_AW315_ORIGINAL_SECURITY_DENIAL_ESCAPED" else
                "C2_AW315_FIXED_SECURITY_DENIAL_HANDLED")

        // Independently justified benign control: occupied port must be
        // handled in both original/fixed code without starting the server.
        ServerSocket(0).use { held ->
            BuildConfig.SERVER_PORT = held.localPort
            RustInterface.serverStarted = false
            RustInterface().startServerTask()
            check(!RustInterface.serverStarted) { "Port-in-use incorrectly started server" }
        }
        println("C2_AW315_BENIGN_BIND_CONFLICT_HANDLED")
    }
}
