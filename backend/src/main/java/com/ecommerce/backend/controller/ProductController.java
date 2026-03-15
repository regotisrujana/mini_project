package com.ecommerce.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.ecommerce.backend.entity.Product;
import com.ecommerce.backend.entity.ProductVariant;
import com.ecommerce.backend.repository.ProductRepository;
import com.ecommerce.backend.repository.ProductVariantRepository;
import com.ecommerce.backend.repository.CartItemRepository;
import com.ecommerce.backend.repository.ProductRatingRepository;
import com.ecommerce.backend.repository.UserRepository;
import com.ecommerce.backend.repository.WishlistItemRepository;
import com.ecommerce.backend.security.JwtService;
import com.ecommerce.backend.service.CloudinaryService;
import com.ecommerce.backend.service.ProductRatingService;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "http://localhost:3000")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository variantRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private WishlistItemRepository wishlistItemRepository;

    @Autowired
    private ProductRatingRepository productRatingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private CloudinaryService cloudinaryService;

    @Autowired
    private ProductRatingService productRatingService;

    // ✅ Get all products (Public)
    @GetMapping
    public List<Product> getAllProducts(
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String category
    ) {
        if (gender != null && category != null) {
            return productRepository.findByGenderAndCategory(gender, category);
        } else if (gender != null) {
            return productRepository.findByGender(gender);
        } else if (category != null) {
            return productRepository.findByCategory(category);
        } else {
            return productRepository.findAll();
        }
    }

    // ✅ Get single product
    @GetMapping("/{id}")
    public Product getProduct(@PathVariable Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
    }

    // ✅ Add product (Admin usage for now)
    @PostMapping
    public Product addProduct(
            @RequestParam String name,
            @RequestParam String description,
            @RequestParam double price,
            @RequestParam String gender,
            @RequestParam String category,
            @RequestParam(required = false) String size,
            @RequestParam(required = false) String color,
            @RequestParam(defaultValue = "10") int stock,
            @RequestParam(required = false) String variantStocks,
            @RequestParam(required = false) String imageUrls,
            @RequestParam(required = false) String authToken,
            @RequestParam(defaultValue = "false") boolean hotTrend,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) MultipartFile[] images
    ) {
        requireAdmin(resolveAuthHeader(authHeader, authToken));
        List<String> uploadedImageUrls = images != null ? cloudinaryService.uploadImages(images) : List.of();
        String resolvedImageUrls = !uploadedImageUrls.isEmpty()
                ? String.join(",", uploadedImageUrls)
                : imageUrls;
        Map<String, Integer> sizeStockMap = parseVariantStocks(variantStocks);
        String normalizedSize = !sizeStockMap.isEmpty() ? String.join(", ", sizeStockMap.keySet()) : size;
        int resolvedStock = !sizeStockMap.isEmpty()
                ? sizeStockMap.values().stream().mapToInt(Integer::intValue).sum()
                : stock;

        Product product = Product.builder()
                .name(name)
                .description(description)
                .price(price)
                .gender(gender)
                .category(category)
                .size(normalizedSize)
                .color(color)
                .stock(resolvedStock)
                .rating(0)
                .ratingCount(0)
                .hotTrend(hotTrend)
                .imageUrl((resolvedImageUrls == null || resolvedImageUrls.isBlank()) ? null : resolvedImageUrls)
                .build();

        Product savedProduct = productRepository.save(product);

        if (!sizeStockMap.isEmpty()) {
            sizeStockMap.forEach((variantSize, variantStock) -> variantRepository.save(
                    ProductVariant.builder()
                            .product(savedProduct)
                            .size(variantSize)
                            .color(color)
                            .stock(variantStock)
                            .build()
            ));
        }

        return savedProduct;
    }

    // ✅ Add variant (size + color)
    @PostMapping("/{productId}/variants")
    public ProductVariant addVariant(
            @PathVariable Long productId,
            @RequestBody ProductVariant variant
    ) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        variant.setProduct(product);
        return variantRepository.save(variant);
    }

    // ✅ Get variants of a product
    @GetMapping("/{productId}/variants")
    public List<ProductVariant> getVariants(@PathVariable Long productId) {
        return variantRepository.findByProductId(productId);
    }

    @PostMapping("/{productId}/ratings")
    public Product rateProduct(
            @PathVariable Long productId,
            @RequestParam int value,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return productRatingService.rateProduct(productId, value, authHeader);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void deleteProduct(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        requireAdmin(authHeader);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        cartItemRepository.deleteByProductId(id);
        wishlistItemRepository.deleteByProductId(id);
        productRatingRepository.deleteByProductId(id);
        variantRepository.deleteByProductId(id);
        productRepository.delete(product);
    }

    private Map<String, Integer> parseVariantStocks(String variantStocks) {
        if (variantStocks == null || variantStocks.isBlank()) {
            return Map.of();
        }

        try {
            Map<String, Integer> rawMap = new ObjectMapper().readValue(variantStocks, new TypeReference<Map<String, Integer>>() {});
            return rawMap.entrySet().stream()
                    .filter(entry -> entry.getKey() != null && !entry.getKey().isBlank())
                    .collect(java.util.stream.Collectors.toMap(
                            entry -> entry.getKey().trim(),
                            entry -> Math.max(entry.getValue() == null ? 0 : entry.getValue(), 0),
                            (left, right) -> right,
                            java.util.LinkedHashMap::new
                    ));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid size stock data");
        }
    }

    private void requireAdmin(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing token");
        }

        try {
            String email = jwtService.extractEmail(authHeader.substring(7));
            String role = userRepository.findByEmail(email)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"))
                    .getRole();

            if (!"ADMIN".equalsIgnoreCase(role)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can manage products");
            }
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
        }
    }

    private String resolveAuthHeader(String authHeader, String authToken) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader;
        }

        if (authToken != null && !authToken.isBlank()) {
            return authToken.startsWith("Bearer ") ? authToken : "Bearer " + authToken;
        }

        return authHeader;
    }
}
