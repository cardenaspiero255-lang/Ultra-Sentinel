package com.cardenaspiero255.gamehubultra.data
import android.content.Context
import com.cardenaspiero255.gamehubultra.domain.*

fun main(){
    val store=SessionCoachSessionStore(Context())
    check(store.beginSession("s1","com.game",1000L)){"C2_PR151_BEGIN_CONTROL"}
    check(store.appendSnapshot("other",SessionCoachSnapshot(2000L))==null){"C2_PR151_FOREIGN_APPEND_CONTROL"}
    check(store.appendSnapshot("s1",SessionCoachSnapshot(2000L,batteryPercent=75))==null){"C2_PR151_INITIAL_APPEND_CONTROL"}
    check(store.readActiveSession()?.samples?.size==1){"C2_PR151_SAMPLE_CONTROL"}
    println("C2_PR151_SESSION_DATA_CONTROL_PASS")
    check(store.finishActiveSession(4000L,expectedSessionId="different")==null){
        "C2_PR151_EXPECTED_SESSION_ID_MISMATCH_MUST_NOT_FINISH"
    }
    check(store.readActiveSession()?.sessionId=="s1"){"C2_PR151_ACTIVE_SESSION_MUST_REMAIN"}
    val finished=checkNotNull(store.finishActiveSession(4000L,expectedSessionId="s1"))
    check(finished.endedAtMillis==4000L && finished.samples.size==1){
        "C2_PR151_FINISH_MATCH_CONTROL"
    }
    println("C2_PR151_WRONG_SESSION_CLOSE_REJECTED")
}
