package com.ecommerce.backend.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.ecommerce.backend.dto.CartItemResponse;
import com.ecommerce.backend.entity.CartItem;
import com.ecommerce.backend.entity.Product;
import com.ecommerce.backend.entity.User;
import com.ecommerce.backend.repository.CartItemRepository;
import com.ecommerce.backend.repository.ProductRepository;
import com.ecommerce.backend.repository.UserRepository;
import com.ecommerce.backend.security.JwtService;

@Service
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final JwtService jwtService;
    private final CustomUserDetailsService customUserDetailsService;

    public CartService(
            CartItemRepository cartItemRepository,
            UserRepository userRepository,
            ProductRepository productRepository,
            JwtService jwtService,
            CustomUserDetailsService customUserDetailsService
    ) {
        this.cartItemRepository = cartItemRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.jwtService = jwtService;
        this.customUserDetailsService = customUserDetailsService;
    }

    public List<CartItemResponse> getCart(String authHeader) {
        User user = getCurrentUser(authHeader);
        return cartItemRepository.findByUserId(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<CartItemResponse> addToCart(Long productId, String authHeader) {
        User user = getCurrentUser(authHeader);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        int maxCartQuantity = getMaxCartQuantity(product);

        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(user.getId(), productId)
                .orElseGet(() -> CartItem.builder()
                        .user(user)
                        .product(product)
                        .quantity(0)
                        .build());

        if (maxCartQuantity <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product is out of stock");
        }

        if (cartItem.getQuantity() >= maxCartQuantity) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can add only available stock for this product");
        }

        cartItem.setQuantity(cartItem.getQuantity() + 1);
        cartItemRepository.save(cartItem);

        return getCart(authHeader);
    }

    public List<CartItemResponse> updateQuantity(Long productId, int quantity, String authHeader) {
        User user = getCurrentUser(authHeader);

        if (quantity <= 0) {
            return removeFromCart(productId, authHeader);
        }

        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(user.getId(), productId)
                .orElseThrow(() -> new RuntimeException("Cart item not found"));

        int maxCartQuantity = getMaxCartQuantity(cartItem.getProduct());
        if (quantity > maxCartQuantity) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can add only available stock for this product");
        }

        cartItem.setQuantity(quantity);
        cartItemRepository.save(cartItem);

        return getCart(authHeader);
    }

    public List<CartItemResponse> removeFromCart(Long productId, String authHeader) {
        User user = getCurrentUser(authHeader);

        cartItemRepository.findByUserIdAndProductId(user.getId(), productId)
                .ifPresent(cartItemRepository::delete);

        return getCart(authHeader);
    }

    private CartItemResponse toResponse(CartItem cartItem) {
        Product product = cartItem.getProduct();
        String imageUrl = product.getImageUrl();
        String primaryImage = imageUrl == null ? null : imageUrl.split(",")[0].trim();
        int stock = getResolvedStock(product);
        int maxCartQuantity = getMaxCartQuantity(product);
        return new CartItemResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                primaryImage,
                product.getPrice(),
                cartItem.getQuantity(),
                stock,
                maxCartQuantity
        );
    }

    private int getResolvedStock(Product product) {
        return product.getStock() == null ? 10 : Math.max(product.getStock(), 0);
    }

    private int getMaxCartQuantity(Product product) {
        int stock = getResolvedStock(product);
        if (stock <= 0) {
            return 0;
        }
        return stock > 1 ? stock - 1 : 1;
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
