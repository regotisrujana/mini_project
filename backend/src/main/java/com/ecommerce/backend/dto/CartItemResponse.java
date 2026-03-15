package com.ecommerce.backend.dto;

public class CartItemResponse {

    private Long productId;
    private String name;
    private String description;
    private String imageUrl;
    private double price;
    private int quantity;
    private int stock;
    private int maxCartQuantity;

    public CartItemResponse() {
    }

    public CartItemResponse(Long productId, String name, String description, String imageUrl, double price, int quantity, int stock, int maxCartQuantity) {
        this.productId = productId;
        this.name = name;
        this.description = description;
        this.imageUrl = imageUrl;
        this.price = price;
        this.quantity = quantity;
        this.stock = stock;
        this.maxCartQuantity = maxCartQuantity;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public int getStock() {
        return stock;
    }

    public void setStock(int stock) {
        this.stock = stock;
    }

    public int getMaxCartQuantity() {
        return maxCartQuantity;
    }

    public void setMaxCartQuantity(int maxCartQuantity) {
        this.maxCartQuantity = maxCartQuantity;
    }
}
