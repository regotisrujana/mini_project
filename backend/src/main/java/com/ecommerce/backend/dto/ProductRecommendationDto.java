package com.ecommerce.backend.dto;

import com.ecommerce.backend.entity.Product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRecommendationDto {
    private Product product;
    private String matchReason;
    private int matchScore;
}
