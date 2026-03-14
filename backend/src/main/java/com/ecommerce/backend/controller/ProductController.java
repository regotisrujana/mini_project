package com.ecommerce.backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.backend.entity.Product;
import com.ecommerce.backend.entity.ProductVariant;
import com.ecommerce.backend.repository.ProductRepository;
import com.ecommerce.backend.repository.ProductVariantRepository;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "http://localhost:3000")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository variantRepository;

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
    public Product addProduct(@RequestBody Product product) {
        return productRepository.save(product);
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
}
