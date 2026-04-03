package com.ecommerce.backend.service;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import javax.imageio.ImageIO;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.ecommerce.backend.dto.ColorAnalysisResponse;
import com.ecommerce.backend.dto.ColorRecommendationDto;
import com.ecommerce.backend.dto.ProductRecommendationDto;
import com.ecommerce.backend.dto.SkinToneProfileDto;
import com.ecommerce.backend.entity.Product;
import com.ecommerce.backend.repository.ProductRepository;

import org.springframework.http.HttpStatus;

@Service
public class ColorAnalysisService {

    private static final Map<String, String> COLOR_HEX = Map.ofEntries(
            Map.entry("Emerald", "#0F8B6D"),
            Map.entry("Teal", "#0E7490"),
            Map.entry("Coral", "#FF7F6E"),
            Map.entry("Peach", "#F7A98F"),
            Map.entry("Mustard", "#D5A021"),
            Map.entry("Olive", "#708238"),
            Map.entry("Rust", "#B55239"),
            Map.entry("Camel", "#B08968"),
            Map.entry("Navy", "#1F3C88"),
            Map.entry("Cobalt", "#2563EB"),
            Map.entry("Berry", "#A61E4D"),
            Map.entry("Rose Pink", "#D96C8D"),
            Map.entry("Lavender", "#9B87F5"),
            Map.entry("Plum", "#6B2D5C"),
            Map.entry("Soft White", "#F7F5F0"),
            Map.entry("Taupe", "#B8A89A"),
            Map.entry("Charcoal", "#36454F"),
            Map.entry("Black", "#111111"),
            Map.entry("Bright Neon", "#DFFF00"),
            Map.entry("Ash Grey", "#9CA3AF"),
            Map.entry("Dusty Beige", "#D6C0B3"),
            Map.entry("Ice Blue", "#BFE3FF")
    );

    private static final Map<String, Set<String>> PRODUCT_COLOR_ALIASES = Map.ofEntries(
            Map.entry("Emerald", Set.of("green")),
            Map.entry("Teal", Set.of("green", "blue")),
            Map.entry("Coral", Set.of("pink", "red", "orange")),
            Map.entry("Peach", Set.of("pink", "orange", "cream")),
            Map.entry("Mustard", Set.of("yellow", "mustard")),
            Map.entry("Olive", Set.of("green", "olive")),
            Map.entry("Rust", Set.of("brown", "red", "orange")),
            Map.entry("Camel", Set.of("brown", "beige", "tan")),
            Map.entry("Navy", Set.of("blue", "navy")),
            Map.entry("Cobalt", Set.of("blue")),
            Map.entry("Berry", Set.of("pink", "red", "purple")),
            Map.entry("Rose Pink", Set.of("pink")),
            Map.entry("Lavender", Set.of("purple", "pink")),
            Map.entry("Plum", Set.of("purple", "maroon", "brown")),
            Map.entry("Soft White", Set.of("white", "cream", "off white")),
            Map.entry("Taupe", Set.of("brown", "grey", "beige")),
            Map.entry("Charcoal", Set.of("grey", "black")),
            Map.entry("Black", Set.of("black")),
            Map.entry("Bright Neon", Set.of("yellow", "green", "orange", "pink")),
            Map.entry("Ash Grey", Set.of("grey", "silver")),
            Map.entry("Dusty Beige", Set.of("beige", "cream", "brown")),
            Map.entry("Ice Blue", Set.of("blue", "silver"))
    );

    private final ProductRepository productRepository;

    public ColorAnalysisService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public ColorAnalysisResponse analyze(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please upload an image to analyze");
        }

        BufferedImage bufferedImage = readImage(image);
        SkinSample sample = extractSkinSample(bufferedImage);
        PaletteProfile palette = buildPalette(sample);
        List<ProductRecommendationDto> productRecommendations = recommendProducts(palette.recommendedColors());

        return ColorAnalysisResponse.builder()
                .profile(SkinToneProfileDto.builder()
                        .depth(palette.depth())
                        .undertone(palette.undertone())
                        .season(palette.season())
                        .summary(palette.summary())
                        .build())
                .recommendedColors(buildColorRecommendations(palette.recommendedColors(), true))
                .colorsToAvoid(buildColorRecommendations(palette.colorsToAvoid(), false))
                .productRecommendations(productRecommendations)
                .analysisNote("This assistant estimates tone from visible pixels in the uploaded photo and works best in natural light with a clear face shot.")
                .build();
    }

    private BufferedImage readImage(MultipartFile image) {
        try {
            BufferedImage bufferedImage = ImageIO.read(image.getInputStream());
            if (bufferedImage == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported image format");
            }
            return bufferedImage;
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read uploaded image");
        }
    }

    private SkinSample extractSkinSample(BufferedImage image) {
        int startX = Math.max(0, image.getWidth() / 5);
        int endX = Math.min(image.getWidth(), image.getWidth() * 4 / 5);
        int startY = Math.max(0, image.getHeight() / 6);
        int endY = Math.min(image.getHeight(), image.getHeight() * 5 / 6);

        long redSum = 0;
        long greenSum = 0;
        long blueSum = 0;
        int matchCount = 0;

        for (int y = startY; y < endY; y += 2) {
            for (int x = startX; x < endX; x += 2) {
                int rgb = image.getRGB(x, y);
                int red = (rgb >> 16) & 0xFF;
                int green = (rgb >> 8) & 0xFF;
                int blue = rgb & 0xFF;

                if (looksLikeSkin(red, green, blue)) {
                    redSum += red;
                    greenSum += green;
                    blueSum += blue;
                    matchCount++;
                }
            }
        }

        if (matchCount == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Couldn't detect enough facial skin tones. Try a brighter, front-facing photo."
            );
        }

        double averageRed = redSum / (double) matchCount;
        double averageGreen = greenSum / (double) matchCount;
        double averageBlue = blueSum / (double) matchCount;
        double luminance = (0.299 * averageRed) + (0.587 * averageGreen) + (0.114 * averageBlue);

        return new SkinSample(averageRed, averageGreen, averageBlue, luminance);
    }

    private boolean looksLikeSkin(int red, int green, int blue) {
        int max = Math.max(red, Math.max(green, blue));
        int min = Math.min(red, Math.min(green, blue));
        boolean rgbRule = red > 60 && green > 35 && blue > 20 && (max - min) > 12 && red > green && red > blue;

        double cb = 128 - (0.168736 * red) - (0.331264 * green) + (0.5 * blue);
        double cr = 128 + (0.5 * red) - (0.418688 * green) - (0.081312 * blue);
        boolean ycbcrRule = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;

        return rgbRule && ycbcrRule;
    }

    private PaletteProfile buildPalette(SkinSample sample) {
        String undertone = determineUndertone(sample);
        String depth = determineDepth(sample.luminance());
        String season = determineSeason(depth, undertone);

        List<String> recommendedColors;
        List<String> colorsToAvoid;
        String summary;

        switch (season) {
            case "Warm Spring" -> {
                recommendedColors = List.of("Coral", "Peach", "Teal", "Emerald", "Soft White", "Camel");
                colorsToAvoid = List.of("Ash Grey", "Ice Blue", "Black");
                summary = "Your photo reads as warm and bright, so lively warm shades and clear jewel tones should lift your complexion.";
            }
            case "Warm Autumn" -> {
                recommendedColors = List.of("Olive", "Rust", "Mustard", "Camel", "Teal", "Cream");
                colorsToAvoid = List.of("Ice Blue", "Ash Grey", "Bright Neon");
                summary = "Your tones look warm and deeper, which usually pairs best with earthy, rich shades instead of icy colors.";
            }
            case "Cool Summer" -> {
                recommendedColors = List.of("Rose Pink", "Lavender", "Taupe", "Soft White", "Berry", "Ice Blue");
                colorsToAvoid = List.of("Mustard", "Rust", "Bright Neon");
                summary = "Your photo leans cool and softly balanced, so muted cool shades and elegant pastels should look especially flattering.";
            }
            case "Cool Winter" -> {
                recommendedColors = List.of("Cobalt", "Berry", "Black", "Charcoal", "Emerald", "Soft White");
                colorsToAvoid = List.of("Dusty Beige", "Mustard", "Olive");
                summary = "Your tones look cool with stronger contrast, so crisp high-contrast colors and saturated jewel shades should suit you well.";
            }
            default -> {
                recommendedColors = List.of("Teal", "Berry", "Soft White", "Taupe", "Emerald", "Rose Pink");
                colorsToAvoid = List.of("Bright Neon", "Mustard", "Ash Grey");
                summary = "Your tone looks fairly balanced, so versatile mid-intensity shades with either soft warmth or cool depth should work well.";
            }
        }

        return new PaletteProfile(depth, undertone, season, summary, normalizeColors(recommendedColors), normalizeColors(colorsToAvoid));
    }

    private String determineUndertone(SkinSample sample) {
        double warmthScore = sample.red() - sample.blue();
        double oliveScore = sample.green() - sample.blue();

        if (warmthScore >= 32 && oliveScore >= 8) {
            return "Warm";
        }
        if (warmthScore <= 15) {
            return "Cool";
        }
        return "Neutral";
    }

    private String determineDepth(double luminance) {
        if (luminance >= 185) {
            return "Light";
        }
        if (luminance >= 135) {
            return "Medium";
        }
        return "Deep";
    }

    private String determineSeason(String depth, String undertone) {
        if ("Warm".equals(undertone) && "Light".equals(depth)) {
            return "Warm Spring";
        }
        if ("Warm".equals(undertone)) {
            return "Warm Autumn";
        }
        if ("Cool".equals(undertone) && "Deep".equals(depth)) {
            return "Cool Winter";
        }
        if ("Cool".equals(undertone)) {
            return "Cool Summer";
        }
        return "Neutral";
    }

    private List<String> normalizeColors(List<String> colors) {
        List<String> normalized = new ArrayList<>();
        for (String color : colors) {
            if ("Cream".equals(color)) {
                normalized.add("Soft White");
            } else {
                normalized.add(color);
            }
        }
        return normalized;
    }

    private List<ColorRecommendationDto> buildColorRecommendations(List<String> colors, boolean flattering) {
        return colors.stream()
                .distinct()
                .map(color -> ColorRecommendationDto.builder()
                        .name(color)
                        .hex(COLOR_HEX.getOrDefault(color, "#D1D5DB"))
                        .reason(flattering
                                ? "This shade should complement the balance and contrast in your skin tone."
                                : "This shade may flatten your complexion compared with the stronger matches above.")
                        .build())
                .toList();
    }

    private List<ProductRecommendationDto> recommendProducts(List<String> recommendedColors) {
        List<Product> products = productRepository.findAll();
        Map<Long, ProductRecommendationDto> scoredProducts = new LinkedHashMap<>();

        for (Product product : products) {
            int score = scoreProduct(product, recommendedColors);
            if (score <= 0) {
                continue;
            }

            String bestColor = findBestMatchingColor(product, recommendedColors);
            scoredProducts.put(product.getId(), ProductRecommendationDto.builder()
                    .product(product)
                    .matchScore(score)
                    .matchReason(bestColor == null
                            ? "A versatile style pick for your palette."
                            : "Matches your recommended " + bestColor + " palette.")
                    .build());
        }

        return scoredProducts.values().stream()
                .sorted(Comparator.comparingInt(ProductRecommendationDto::getMatchScore).reversed()
                        .thenComparing(item -> item.getProduct().getRating(), Comparator.reverseOrder()))
                .limit(8)
                .toList();
    }

    private int scoreProduct(Product product, List<String> recommendedColors) {
        Set<String> productColors = splitProductColors(product.getColor());
        int score = 0;

        for (String recommendedColor : recommendedColors) {
            Set<String> aliases = PRODUCT_COLOR_ALIASES.getOrDefault(recommendedColor, Set.of(recommendedColor.toLowerCase(Locale.ROOT)));
            boolean directMatch = productColors.stream().anyMatch(aliases::contains);
            if (directMatch) {
                score += 10;
            }
        }

        if (Boolean.TRUE.equals(product.isHotTrend())) {
            score += 2;
        }
        if ((product.getRating() >= 4.0)) {
            score += 3;
        }
        if (product.getStock() != null && product.getStock() > 0) {
            score += 1;
        }

        return score;
    }

    private String findBestMatchingColor(Product product, List<String> recommendedColors) {
        Set<String> productColors = splitProductColors(product.getColor());
        for (String recommendedColor : recommendedColors) {
            Set<String> aliases = PRODUCT_COLOR_ALIASES.getOrDefault(recommendedColor, Set.of(recommendedColor.toLowerCase(Locale.ROOT)));
            if (productColors.stream().anyMatch(aliases::contains)) {
                return recommendedColor;
            }
        }
        return null;
    }

    private Set<String> splitProductColors(String colors) {
        if (colors == null || colors.isBlank()) {
            return Set.of();
        }

        Set<String> parsed = new LinkedHashSet<>();
        for (String value : colors.split(",")) {
            String normalized = value.trim().toLowerCase(Locale.ROOT);
            if (!normalized.isBlank()) {
                parsed.add(normalized);
            }
        }
        return parsed;
    }

    private record SkinSample(double red, double green, double blue, double luminance) {}

    private record PaletteProfile(
            String depth,
            String undertone,
            String season,
            String summary,
            List<String> recommendedColors,
            List<String> colorsToAvoid
    ) {}
}
