package com.ecommerce.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.backend.entity.Product;
import com.ecommerce.backend.service.WishlistService;

@RestController
@RequestMapping("/api/wishlist")
@CrossOrigin(origins = "http://localhost:3000")
public class WishlistController {

    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @GetMapping
    public List<Product> getWishlist(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return wishlistService.getWishlist(authHeader);
    }

    @PostMapping("/{productId}")
    public List<Product> addToWishlist(
            @PathVariable Long productId,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return wishlistService.addToWishlist(productId, authHeader);
    }

    @DeleteMapping("/{productId}")
    public List<Product> removeFromWishlist(
            @PathVariable Long productId,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return wishlistService.removeFromWishlist(productId, authHeader);
    }
}
