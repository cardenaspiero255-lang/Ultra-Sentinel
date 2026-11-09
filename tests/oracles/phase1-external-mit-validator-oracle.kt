package com.iamkurtgoz.domain.util

/**
 * Independent acceptance oracle for an upstream MIT-licensed ORIGINAL source.
 *
 * Original expected: failure NAME_FINAL_NEWLINE_ACCEPTED.
 * Generated candidate: all tests pass, including benign controls.
 * Unsafe candidate: failure BENIGN_EMAIL_REJECTED.
 * This oracle is written independently of the Hunter/Fixer implementation.
 */
object ExternalMitValidatorOracle {
    @JvmStatic
    fun main(args: Array<String>) {
        require(args.isEmpty())

        // Ordinary controls: these must remain valid after the repair.
        if (!Validator.isValidEmail("alice@example.com")) error("BENIGN_EMAIL_REJECTED")
        if (!Validator.isValidName("Juan")) error("BENIGN_NAME_REJECTED")
        if (!Validator.isValidName("Ana Ruiz")) error("BENIGN_COMPOUND_NAME_REJECTED")
        if (!Validator.isValidTelephone("555-123-4567")) error("BENIGN_PHONE_REJECTED")

        // An exact whole-input validator must reject line terminators.
        if (Validator.isValidName("Juan\n")) error("NAME_FINAL_NEWLINE_ACCEPTED")
        if (Validator.isValidTelephone("555-123-4567\n")) error("PHONE_FINAL_NEWLINE_ACCEPTED")
        if (Validator.isValidEmail("alice@example.com\n")) error("EMAIL_FINAL_NEWLINE_ACCEPTED")

        // Ordinary negative controls: reject malformed fields.
        if (Validator.isValidName("J")) error("SHORT_NAME_ACCEPTED")
        if (Validator.isValidTelephone("not-a-phone")) error("NONPHONE_ACCEPTED")
        if (Validator.isValidEmail("not-an-email")) error("NONEMAIL_ACCEPTED")

        println("MIT_VALIDATOR_ORIGINAL_JVM_INDEPENDENT_ORACLE_GREEN")
    }
}
