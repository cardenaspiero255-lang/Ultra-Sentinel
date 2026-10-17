#!/usr/bin/env python3
"""Counterfactual on a temporary copy. It cannot be counted as original-source truth."""
from pathlib import Path
import sys
if len(sys.argv)!=3:
    raise SystemExit('C2_PR158_COUNTERFACTUAL_USAGE')
source=Path(sys.argv[1]).read_text(encoding='utf8')
replacements=[
('''    private var current: UltraFrontierWorldState? = null

    fun update(state: UltraFrontierWorldState) {
        current = state
    }''',
'''    private var current: UltraFrontierWorldState? = null
    @Volatile
    private var advancedObservedAtMillis: Long? = null

    fun update(state: UltraFrontierWorldState) {
        current = state
        advancedObservedAtMillis = state.timestampMillis.takeIf {
            state.thermalTrend != null || state.thermalRisk != null ||
                state.thermalConfidence != null || state.batteryRecommendation != null ||
                state.preventAggressiveProfiles || state.adaptiveScore != null
        }
    }'''),
('''        val previousAge = previous?.let {
            nowMillis - it.timestampMillis
        }''',
'''        val previousAge = advancedObservedAtMillis?.let {
            nowMillis - it
        }'''),
('''        } else {
            base
        }
    }

    fun snapshot():''',
'''        } else {
            advancedObservedAtMillis = null
            base
        }
    }

    fun snapshot():'''),
('''    fun clear() {
        current = null
    }''',
'''    fun clear() {
        current = null
        advancedObservedAtMillis = null
    }''')
]
for old,new in replacements:
    if source.count(old)!=1:
        raise SystemExit('C2_PR158_IMMUTABLE_SOURCE_ANCHOR_DRIFT')
    source=source.replace(old,new,1)
Path(sys.argv[2]).write_text(source,encoding='utf8')
