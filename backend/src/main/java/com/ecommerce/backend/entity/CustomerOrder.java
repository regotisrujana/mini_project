package com.ecommerce.backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private String razorpayOrderId;

    private String razorpayPaymentId;

    private String status;

    private double totalMrp;

    private double couponDiscount;

    private double platformFee;

    private double finalAmount;

    private String couponCode;

    private String fullName;

    private String phone;

    private String pincode;

    @Column(length = 1000)
    private String addressLine;

    private String city;

    private String state;

    private Double latitude;

    private Double longitude;

    private LocalDateTime createdAt;
}
