package com.ecommerce.backend.entity;

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
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(length = 1000)
    private String description;

    private double price;

    private String gender; 
    // MEN or WOMEN

    private String category; 
    // MEN: TSHIRT, FORMAL_SHIRT, JEANS
    // WOMEN: WESTERN_TOPS, KURTHI, KURTHI_SET, BOTTOMS, JEANS

    private String size;

    private String color;

    private double rating;

    private int ratingCount;

    private boolean hotTrend;

    private Integer stock;

    private String imageUrl;
}
