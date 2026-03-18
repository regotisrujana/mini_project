package com.ecommerce.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ecommerce.backend.entity.OrderItem;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    boolean existsByOrderUserIdAndProductId(Long userId, Long productId);
    List<OrderItem> findByOrderUserId(Long userId);
    List<OrderItem> findByOrderIdIn(List<Long> orderIds);
}
