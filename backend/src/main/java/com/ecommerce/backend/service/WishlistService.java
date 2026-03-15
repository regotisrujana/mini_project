package com.ecommerce.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;

import com.ecommerce.backend.entity.Product;
import com.ecommerce.backend.entity.User;
import com.ecommerce.backend.entity.WishlistItem;
import com.ecommerce.backend.repository.ProductRepository;
import com.ecommerce.backend.repository.UserRepository;
import com.ecommerce.backend.repository.WishlistItemRepository;
import com.ecommerce.backend.service.CustomUserDetailsService;
import com.ecommerce.backend.security.JwtService;

@Service
public class WishlistService {

    private final WishlistItemRepository wishlistItemRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final JwtService jwtService;
    private final CustomUserDetailsService customUserDetailsService;

    public WishlistService(
            WishlistItemRepository wishlistItemRepository,
            UserRepository userRepository,
            ProductRepository productRepository,
            JwtService jwtService,
            CustomUserDetailsService customUserDetailsService
    ) {
        this.wishlistItemRepository = wishlistItemRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.jwtService = jwtService;
        this.customUserDetailsService = customUserDetailsService;
    }

    public List<Product> getWishlist(String authHeader) {
        User user = getCurrentUser(authHeader);
        return wishlistItemRepository.findByUserId(user.getId())
                .stream()
                .map(WishlistItem::getProduct)
                .toList();
    }

    public List<Product> addToWishlist(Long productId, String authHeader) {
        User user = getCurrentUser(authHeader);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        wishlistItemRepository.findByUserIdAndProductId(user.getId(), productId)
                .orElseGet(() -> wishlistItemRepository.save(
                        WishlistItem.builder()
                                .user(user)
                                .product(product)
                                .build()
                ));

        return getWishlist(authHeader);
    }

    public List<Product> removeFromWishlist(Long productId, String authHeader) {
        User user = getCurrentUser(authHeader);

        wishlistItemRepository.findByUserIdAndProductId(user.getId(), productId)
                .ifPresent(wishlistItemRepository::delete);

        return getWishlist(authHeader);
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
