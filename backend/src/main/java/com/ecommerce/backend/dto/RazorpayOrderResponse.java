package com.ecommerce.backend.dto;

public class RazorpayOrderResponse {

    private String razorpayOrderId;
    private String keyId;
    private int amount;
    private String currency;
    private double totalMrp;
    private double couponDiscount;
    private double platformFee;
    private double finalAmount;

    public RazorpayOrderResponse() {
    }

    public RazorpayOrderResponse(
            String razorpayOrderId,
            String keyId,
            int amount,
            String currency,
            double totalMrp,
            double couponDiscount,
            double platformFee,
            double finalAmount
    ) {
        this.razorpayOrderId = razorpayOrderId;
        this.keyId = keyId;
        this.amount = amount;
        this.currency = currency;
        this.totalMrp = totalMrp;
        this.couponDiscount = couponDiscount;
        this.platformFee = platformFee;
        this.finalAmount = finalAmount;
    }

    public String getRazorpayOrderId() {
        return razorpayOrderId;
    }

    public void setRazorpayOrderId(String razorpayOrderId) {
        this.razorpayOrderId = razorpayOrderId;
    }

    public String getKeyId() {
        return keyId;
    }

    public void setKeyId(String keyId) {
        this.keyId = keyId;
    }

    public int getAmount() {
        return amount;
    }

    public void setAmount(int amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public double getTotalMrp() {
        return totalMrp;
    }

    public void setTotalMrp(double totalMrp) {
        this.totalMrp = totalMrp;
    }

    public double getCouponDiscount() {
        return couponDiscount;
    }

    public void setCouponDiscount(double couponDiscount) {
        this.couponDiscount = couponDiscount;
    }

    public double getPlatformFee() {
        return platformFee;
    }

    public void setPlatformFee(double platformFee) {
        this.platformFee = platformFee;
    }

    public double getFinalAmount() {
        return finalAmount;
    }

    public void setFinalAmount(double finalAmount) {
        this.finalAmount = finalAmount;
    }
}
