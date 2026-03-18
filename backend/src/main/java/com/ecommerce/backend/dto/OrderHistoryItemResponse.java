package com.ecommerce.backend.dto;

public class OrderHistoryItemResponse {

    private Long productId;
    private String productName;
    private String imageUrl;
    private double price;
    private int quantity;
    private Integer userRating;

    public OrderHistoryItemResponse(
            Long productId,
            String productName,
            String imageUrl,
            double price,
            int quantity,
            Integer userRating
    ) {
        this.productId = productId;
        this.productName = productName;
        this.imageUrl = imageUrl;
        this.price = price;
        this.quantity = quantity;
        this.userRating = userRating;
    }

    public Long getProductId() {
        return productId;
    }

    public String getProductName() {
        return productName;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public double getPrice() {
        return price;
    }

    public int getQuantity() {
        return quantity;
    }

    public Integer getUserRating() {
        return userRating;
    }
}
