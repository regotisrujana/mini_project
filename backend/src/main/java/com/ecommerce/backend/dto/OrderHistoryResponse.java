package com.ecommerce.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public class OrderHistoryResponse {

    private Long id;
    private String orderNumber;
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String paymentMethod;
    private String paymentStatus;
    private String trackingStatus;
    private String fullName;
    private String phone;
    private String pincode;
    private String addressLine;
    private String city;
    private String state;
    private double totalMrp;
    private double couponDiscount;
    private double platformFee;
    private double finalAmount;
    private String couponCode;
    private LocalDateTime createdAt;
    private List<OrderHistoryItemResponse> items;

    public OrderHistoryResponse(
            Long id,
            String orderNumber,
            String razorpayOrderId,
            String razorpayPaymentId,
            String paymentMethod,
            String paymentStatus,
            String trackingStatus,
            String fullName,
            String phone,
            String pincode,
            String addressLine,
            String city,
            String state,
            double totalMrp,
            double couponDiscount,
            double platformFee,
            double finalAmount,
            String couponCode,
            LocalDateTime createdAt,
            List<OrderHistoryItemResponse> items
    ) {
        this.id = id;
        this.orderNumber = orderNumber;
        this.razorpayOrderId = razorpayOrderId;
        this.razorpayPaymentId = razorpayPaymentId;
        this.paymentMethod = paymentMethod;
        this.paymentStatus = paymentStatus;
        this.trackingStatus = trackingStatus;
        this.fullName = fullName;
        this.phone = phone;
        this.pincode = pincode;
        this.addressLine = addressLine;
        this.city = city;
        this.state = state;
        this.totalMrp = totalMrp;
        this.couponDiscount = couponDiscount;
        this.platformFee = platformFee;
        this.finalAmount = finalAmount;
        this.couponCode = couponCode;
        this.createdAt = createdAt;
        this.items = items;
    }

    public Long getId() {
        return id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public String getRazorpayOrderId() {
        return razorpayOrderId;
    }

    public String getRazorpayPaymentId() {
        return razorpayPaymentId;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public String getTrackingStatus() {
        return trackingStatus;
    }

    public String getFullName() {
        return fullName;
    }

    public String getPhone() {
        return phone;
    }

    public String getPincode() {
        return pincode;
    }

    public String getAddressLine() {
        return addressLine;
    }

    public String getCity() {
        return city;
    }

    public String getState() {
        return state;
    }

    public double getTotalMrp() {
        return totalMrp;
    }

    public double getCouponDiscount() {
        return couponDiscount;
    }

    public double getPlatformFee() {
        return platformFee;
    }

    public double getFinalAmount() {
        return finalAmount;
    }

    public String getCouponCode() {
        return couponCode;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public List<OrderHistoryItemResponse> getItems() {
        return items;
    }
}
