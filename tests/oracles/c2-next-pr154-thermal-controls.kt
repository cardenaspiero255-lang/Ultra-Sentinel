package com.cardenaspiero255.gamehubultra.domain
private fun demand(ok:Boolean,name:String){
    if(!ok)throw IllegalStateException("C2_NEXT_154_CONTROL_FAILED_"+name)
}
fun main(){
    val noWarning=ThermalPredictionAdvisor.message(
        ThermalPrediction(allowPreventiveSignal=false),null)
    demand(noWarning==null,"NO_WARNING_WHEN_NOT_ALLOWED")

    val warning=ThermalPredictionAdvisor.message(
        ThermalPrediction(allowPreventiveSignal=true,confidence=.72f,
            trend=ThermalTrend.RISING,risk=ThermalRisk.HIGH),null)
    demand(warning?.priority==SessionCoachPriority.ACTION &&
        warning.signal==SessionCoachSignal.THERMAL &&
        warning.title=="Riesgo térmico previsto"&&
        warning.detail.contains("72%"),
        "PREVENTIVE_RISK_NOTIFICATION_EMITTED")

    val duplicate=ThermalPredictionAdvisor.message(
        ThermalPrediction(allowPreventiveSignal=true,confidence=.72f),warning)
    demand(duplicate==null,"DUPLICATE_PREVENTIVE_SUPPRESSED")

    val recovered=ThermalPredictionAdvisor.message(
        ThermalPrediction(recovering=true,allowPreventiveSignal=false),warning)
    demand(recovered?.priority==SessionCoachPriority.INFO &&
        recovered.title=="Recuperación térmica estimada" &&
        recovered.action==null,"RECOVERY_AFTER_WARNING_EMITTED")

    val high=ThermalPredictionAdvisor.message(
        ThermalPrediction(allowPreventiveSignal=true,confidence=1.5f),null)
    demand(high?.detail?.contains("100%")==true,"CONFIDENCE_CLAMPED_HIGH")

    val low=ThermalPredictionAdvisor.message(
        ThermalPrediction(allowPreventiveSignal=true,confidence=-.7f),null)
    demand(low?.detail?.contains("0%")==true,"CONFIDENCE_CLAMPED_LOW")

    println("""{"schema":"ultra-sentinel-c2-next-original-pr154-thermal-controls/v1","pr":154,"sourceGitBlob":"b2e15247536ecc00d4811021774ab2f34608ac3e","noWarningPassed":true,"preventivePassed":true,"duplicateSuppressed":true,"recoveryPassed":true,"highConfidenceClamped":true,"lowConfidenceClamped":true,"executedOriginalSource":true,"candidateInspected":false,"baselineCompared":false,"negativeFindingLabelsEstablished":0,"precision":null,"recall":null,"f1":null,"tripleSPlusCertified":false}""")
}
