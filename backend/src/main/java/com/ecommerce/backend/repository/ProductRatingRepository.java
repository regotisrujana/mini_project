package com.ecommerce.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ecommerce.backend.entity.ProductRating;

public interface ProductRatingRepository extends JpaRepository<ProductRating, Long> {

    Optional<ProductRating> findByUserIdAndProductId(Long userId, Long productId);
    List<ProductRating> findByUserIdAndProductIdIn(Long userId, List<Long> productIds);

    List<ProductRating> findByProductId(Long productId);

    void deleteByProductId(Long productId);
}
