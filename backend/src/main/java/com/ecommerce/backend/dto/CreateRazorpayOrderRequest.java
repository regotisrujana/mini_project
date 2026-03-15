package com.ecommerce.backend.dto;

public class CreateRazorpayOrderRequest {

    private AddressRequest address;
    private String couponCode;

    public AddressRequest getAddress() {
        return address;
    }

    public void setAddress(AddressRequest address) {
        this.address = address;
    }

    public String getCouponCode() {
        return couponCode;
    }

    public void setCouponCode(String couponCode) {
        this.couponCode = couponCode;
    }
}
