package com.ecommerce.backend.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.ecommerce.backend.entity.Product;
import com.ecommerce.backend.entity.ProductRating;
import com.ecommerce.backend.entity.User;
import com.ecommerce.backend.repository.OrderItemRepository;
import com.ecommerce.backend.repository.ProductRatingRepository;
import com.ecommerce.backend.repository.ProductRepository;
import com.ecommerce.backend.repository.UserRepository;
import com.ecommerce.backend.security.JwtService;

@Service
public class ProductRatingService {

    private final ProductRatingRepository productRatingRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderItemRepository orderItemRepository;
    private final JwtService jwtService;
    private final CustomUserDetailsService customUserDetailsService;

    public ProductRatingService(
            ProductRatingRepository productRatingRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            OrderItemRepository orderItemRepository,
            JwtService jwtService,
            CustomUserDetailsService customUserDetailsService
    ) {
        this.productRatingRepository = productRatingRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.orderItemRepository = orderItemRepository;
        this.jwtService = jwtService;
        this.customUserDetailsService = customUserDetailsService;
    }

    public Product rateProduct(Long productId, int ratingValue, String authHeader) {
        if (ratingValue < 1 || ratingValue > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating must be between 1 and 5");
        }

        User user = getCurrentUser(authHeader);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        if (!orderItemRepository.existsByOrderUserIdAndProductId(user.getId(), productId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only customers who purchased this product can rate it");
        }

        ProductRating productRating = productRatingRepository.findByUserIdAndProductId(user.getId(), productId)
                .orElseGet(() -> ProductRating.builder()
                        .user(user)
                        .product(product)
                        .build());

        productRating.setRating(ratingValue);
        productRatingRepository.save(productRating);

        List<ProductRating> ratings = productRatingRepository.findByProductId(productId);
        double average = ratings.stream()
                .mapToInt(ProductRating::getRating)
                .average()
                .orElse(0);

        product.setRating(Math.round(average * 10.0) / 10.0);
        product.setRatingCount(ratings.size());

        return productRepository.save(product);
    }

    private User getCurrentUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing token");
        }

        try {
            String token = authHeader.substring(7);
            String email = jwtService.extractEmail(token);
            UserDetails userDetails = customUserDetailsService.loadUserByUsername(email);

            if (!jwtService.isTokenValid(token, userDetails)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
            }

            return userRepository.findByEmail(email)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
        }
    }
}
