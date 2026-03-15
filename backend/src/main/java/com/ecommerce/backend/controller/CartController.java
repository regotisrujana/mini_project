package com.ecommerce.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.backend.dto.CartItemResponse;
import com.ecommerce.backend.service.CartService;

@RestController
@RequestMapping("/api/cart")
@CrossOrigin(origins = "http://localhost:3000")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public List<CartItemResponse> getCart(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return cartService.getCart(authHeader);
    }

    @PostMapping("/{productId}")
    public List<CartItemResponse> addToCart(
            @PathVariable Long productId,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return cartService.addToCart(productId, authHeader);
    }

    @PutMapping("/{productId}")
    public List<CartItemResponse> updateQuantity(
            @PathVariable Long productId,
            @RequestParam int quantity,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return cartService.updateQuantity(productId, quantity, authHeader);
    }

    @DeleteMapping("/{productId}")
    public List<CartItemResponse> removeFromCart(
            @PathVariable Long productId,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return cartService.removeFromCart(productId, authHeader);
    }
}
