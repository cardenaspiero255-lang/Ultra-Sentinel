#!/usr/bin/env python3
"""Temporary source-independent sensitivity control, never a real original-source label."""
from pathlib import Path
import sys

if len(sys.argv) != 3:
    raise SystemExit('C2_PR152_MISSING_ARGS')
src=Path(sys.argv[1]).read_text(encoding='utf-8')
old='        val body = pattern.find(json)?.groupValues?.get(1) ?: return emptyList()'
new='''        val match = pattern.find(json) ?: return emptyList()
        val start = match.range.first + match.value.indexOf('[') + 1
        var end = -1
        var insideString = false
        var escaped = false
        for (index in start until json.length) {
            val char = json[index]
            if (escaped) {
                escaped = false
            } else if (char == '\\\\') {
                escaped = true
            } else if (char == '"') {
                insideString = !insideString
            } else if (char == ']' && !insideString) {
                end = index
                break
            }
        }
        if (end < 0) return emptyList()
        val body = json.substring(start, end)'''
if src.count(old) != 1:
    raise SystemExit('C2_PR152_FROZEN_SOURCE_PATTERN_DRIFT')
Path(sys.argv[2]).write_text(src.replace(old,new),encoding='utf-8')
