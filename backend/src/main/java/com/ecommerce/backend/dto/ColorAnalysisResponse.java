package com.ecommerce.backend.dto;

import java.util.List;

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
public class ColorAnalysisResponse {
    private SkinToneProfileDto profile;
    private List<ColorRecommendationDto> recommendedColors;
    private List<ColorRecommendationDto> colorsToAvoid;
    private List<ProductRecommendationDto> productRecommendations;
    private String analysisNote;
}
