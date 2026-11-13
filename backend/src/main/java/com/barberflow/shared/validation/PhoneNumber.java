package com.barberflow.shared.validation;

public final class PhoneNumber {

    public static final String PATTERN = "^(?=(?:\\D*[0-9]){7})[+0-9() .-]{7,30}$";

    private PhoneNumber() {
    }
}
