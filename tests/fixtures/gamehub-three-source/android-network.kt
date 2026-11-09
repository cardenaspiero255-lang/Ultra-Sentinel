package android.net
import java.net.URL
import java.net.URLConnection

class ConnectivityManager {
    val activeNetwork: Network? = null
    val isActiveNetworkMetered: Boolean = true
    fun getNetworkCapabilities(network: Network): NetworkCapabilities? = null
}
class Network {
    val networkHandle: Long = 0L
    fun openConnection(url: URL): URLConnection = throw SecurityException("network disabled in ABI")
}
class NetworkCapabilities {
    val linkDownstreamBandwidthKbps: Int = 0
    fun hasTransport(type: Int): Boolean = false
    fun hasCapability(type: Int): Boolean = false
    companion object {
        const val TRANSPORT_WIFI = 1
        const val TRANSPORT_CELLULAR = 2
        const val TRANSPORT_ETHERNET = 3
        const val TRANSPORT_BLUETOOTH = 4
        const val NET_CAPABILITY_INTERNET = 5
        const val NET_CAPABILITY_VALIDATED = 6
    }
}
