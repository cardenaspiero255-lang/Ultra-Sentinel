import com.cardenaspiero255.gamehubultra.performance.framepacing.*
import com.cardenaspiero255.gamehubultra.network.diagnostics.*
import com.cardenaspiero255.gamehubultra.ui.home.state.*
import com.cardenaspiero255.gamehubultra.network.NetworkStability
import kotlin.math.abs

/*
 * Real-source C2 oracles: the frame, network and UI logic are compiled from
 * SHA-pinned original GameHub files, NOT re-implemented by this test.
 * Stubs cover only adjacent Android/domain types, not the behavior under test.
 */
private fun checkControl(condition: Boolean, reason: String) {
    if (!condition) error("C2_KOTLIN_CONTROL_FAILED_" + reason)
}
private fun frameCase(): Boolean {
    val engine=FramePacingIntelligenceEngine()
    val slow=(0..5).map { RefreshSample(200_000L + it * 1_000L,60f) }
    val fresh=(0..19).map { FrameTimingSample(204_000L + it * 50L,16.6f) }
    val stale=(0..19).map { FrameTimingSample(1_000L + it * 50L,16.6f) }
    fun run(frames: List<FrameTimingSample>): FramePacingAssessment =
        engine.analyze(targetHz=60,refreshSamples=slow,frameTimingSamples=frames,
            thermal=null,battery=null,supportedRefreshRatesHz=listOf(60,90),
            interpolationState=InterpolationState(requested=false,
                capabilityVerified=false,observedActive=false))
    checkControl(run(fresh).pacingAvailability==FrameDataAvailability.AVAILABLE,
        "FRAME_FRESH_SAMPLE_ACCEPTED")
    checkControl(run(emptyList()).pacingAvailability==
        FrameDataAvailability.PACING_UNAVAILABLE,"FRAME_NO_SAMPLE_REJECTED")
    val actual=run(stale)
    // Slow clock is 205000; newest fast timing is 1950, >200 seconds old.
    return actual.pacingAvailability==FrameDataAvailability.AVAILABLE &&
        actual.sampleCountFast==20
}
private data class NetworkResult(val reproduced:Boolean,val mixedAverageMs:Double?)
private fun networkCase(): NetworkResult {
    val engine=NetworkGamingDiagnosticsEngine()
    fun observations(changeTransport:Boolean,changeHandle:Boolean):List<NetworkGamingDiagnosticSample> =
        (0..5).map { index ->
            val later=index>=3
            NetworkGamingDiagnosticSample(
                timestampMs=(index+1)*1000L,
                networkHandle=if(later&&changeHandle) 98L else 77L,
                transport=if(later&&changeTransport) "CELLULAR" else "WIFI",
                connected=true,validated=true,metered=false,
                latencyMs=if(later)30L else 400L,
                latencyMeasured=true,packetLossPercent=0.0,
                packetLossMeasured=true)
        }
    val stable=engine.analyze(observations(changeTransport=false,changeHandle=false))
    val newHandle=engine.analyze(observations(changeTransport=true,changeHandle=true))
    checkControl(stable.latencyHistoryMs.size==6 &&
        abs((stable.metrics.averageLatencyMs?:-1.0)-215.0)<1e-8,
        "NETWORK_CONTIGUOUS_SAMPLES_PRESERVED")
    checkControl(newHandle.latencyHistoryMs.size==3 &&
        abs((newHandle.metrics.averageLatencyMs?:-1.0)-30.0)<1e-8,
        "NETWORK_NEW_HANDLE_RESETS_METRICS")
    val changed=engine.analyze(observations(changeTransport=true,changeHandle=false))
    // Engine itself recognizes the transport transition, yet still mixes
    // 400ms Wi-Fi values into fresh 30ms cellular measurement on one handle.
    val mixed=changed.transportChanges.size==1 &&
        changed.latencyHistoryMs.size==6 &&
        abs((changed.metrics.averageLatencyMs?:-1.0)-215.0)<1e-8 &&
        changed.metrics.stability==NetworkStability.POOR
    return NetworkResult(mixed,changed.metrics.averageLatencyMs)
}
private fun homeControl(): Boolean {
    val loaded=HomeUiState().reduce(HomeUiEvent.GameCountLoaded(7))
    val requested=loaded.reduce(HomeUiEvent.QuickVoiceListenRequested)
    val consumed=requested.reduce(HomeUiEvent.QuickVoiceListenConsumed)
    return loaded.localGameCount==7 && requested.quickVoiceOpen &&
        requested.quickVoiceListenRequest==1 &&
        consumed.quickVoiceListenRequest==0
}
fun main(){
    checkControl(homeControl(),"HOME_132_REDUCER")
    val frame=frameCase()
    val network=networkCase()
    println("""{"schema":"ultra-sentinel-c2-kotlin-owner-oracles/v1","cases":["""+
        """{"pr":132,"kind":"BENIGN_CONTROL","passed":true,"reproduced":false},"""+
        """{"pr":159,"kind":"POSITIVE_BEHAVIOR","rule":"STALE_FRAME_TIMING_ACCEPTED","path":"app/src/main/java/com/cardenaspiero255/gamehubultra/performance/framepacing/FramePacingIntelligenceEngine.kt","line":129,"reproduced":$frame},"""+
        """{"pr":161,"kind":"POSITIVE_BEHAVIOR","rule":"CROSS_TRANSPORT_LATENCY_MIX","path":"app/src/main/java/com/cardenaspiero255/gamehubultra/network/diagnostics/NetworkGamingDiagnosticsEngine.kt","line":43,"reproduced":${network.reproduced},"observedAverageLatencyMs":${network.mixedAverageMs}}""" +
        """],"controlsPassed":true,"syntheticDefectsClaimed":false,"externalIndependenceClaimed":false,"tripleSPlusCertified":false,"autoMerge":false}""")
}
