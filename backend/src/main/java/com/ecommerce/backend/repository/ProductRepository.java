package com.ecommerce.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ecommerce.backend.entity.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByGender(String gender);

    List<Product> findByCategory(String category);

    List<Product> findByGenderAndCategory(String gender, String category);
}
