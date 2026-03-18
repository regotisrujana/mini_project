package com.ecommerce.backend.controller;

import java.util.Set;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.backend.dto.ConfirmOrderRequest;
import com.ecommerce.backend.dto.CreateRazorpayOrderRequest;
import com.ecommerce.backend.dto.OrderHistoryResponse;
import com.ecommerce.backend.dto.RazorpayOrderResponse;
import com.ecommerce.backend.entity.CustomerOrder;
import com.ecommerce.backend.service.OrderService;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:3000")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/razorpay")
    public RazorpayOrderResponse createRazorpayOrder(
            @RequestBody CreateRazorpayOrderRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return orderService.createRazorpayOrder(request, authHeader);
    }

    @PostMapping("/confirm")
    public CustomerOrder confirmOrder(
            @RequestBody ConfirmOrderRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return orderService.confirmOrder(request, authHeader);
    }

    @GetMapping("/purchased-products")
    public Set<Long> getPurchasedProductIds(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return orderService.getPurchasedProductIds(authHeader);
    }

    @GetMapping
    public List<OrderHistoryResponse> getOrders(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return orderService.getOrders(authHeader);
    }
}
