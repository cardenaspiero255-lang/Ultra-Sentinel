package kotlinx.datetime.internal

import java.time.LocalDate
import java.time.Year

// Independent java.time oracle against unmodified dateCalculations.kt + util.kt.
// This is a bounded benign control, not a global truth label for the holdout.
fun main() {
    val representativeYears = intArrayOf(
        Int.MIN_VALUE, -400, -100, -4, -1, 0, 1, 4, 100, 400,
        1582, 1900, 2000, 2024, 2100, 2400, Int.MAX_VALUE
    )
    for (year in representativeYears) {
        check(isLeapYear(year) == Year.isLeap(year.toLong())) { "LEAP_YEAR_MISMATCH:$year" }
    }
    for (year in intArrayOf(1600, 1900, 2000, 2024, 2100, 2400)) {
        for (month in 1..12) {
            check(month.monthLength(isLeapYear(year)) == LocalDate.of(year, month, 1).lengthOfMonth()) {
                "MONTH_LENGTH_MISMATCH:$year:$month"
            }
        }
    }
    check(SECONDS_PER_DAY == 86_400) { "SECONDS_PER_DAY_CONSTANT" }
    check(NANOS_PER_DAY == 86_400_000_000_000L) { "NANOS_PER_DAY_CONSTANT" }
    for (char in '0'..'9') {
        check(char.isAsciiDigit()) { "DIGIT_RECOGNITION" }
        check(char.asciiDigitToInt() == char.digitToInt()) { "DIGIT_CONVERSION" }
    }
    check(!'x'.isAsciiDigit() && 'x'.isAsciiLetter() && 'Z'.isAsciiLetter()) { "ASCII_CHAR_CLASSIFICATION" }
    check(!'!'.isAsciiLetter()) { "NONLETTER_REJECTION" }
    check(removeLeadingZerosFromLongYearFormLocalDate("2024-01-02") == "2024-01-02") {
        "NORMAL_SHORT_YEAR_MUST_BE_PRESERVED"
    }
    println("ORIGINAL_DATETIME_CALENDAR_BENIGN_CONTROLS_PASS")
}
