package com.ecommerce.backend.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Set;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.ecommerce.backend.dto.AddressRequest;
import com.ecommerce.backend.dto.ConfirmOrderRequest;
import com.ecommerce.backend.dto.CreateRazorpayOrderRequest;
import com.ecommerce.backend.dto.RazorpayOrderResponse;
import com.ecommerce.backend.entity.CartItem;
import com.ecommerce.backend.entity.CustomerOrder;
import com.ecommerce.backend.entity.OrderItem;
import com.ecommerce.backend.entity.User;
import com.ecommerce.backend.repository.CartItemRepository;
import com.ecommerce.backend.repository.CustomerOrderRepository;
import com.ecommerce.backend.repository.OrderItemRepository;
import com.ecommerce.backend.repository.UserRepository;
import com.ecommerce.backend.security.JwtService;

@Service
public class OrderService {

    private final CartItemRepository cartItemRepository;
    private final CustomerOrderRepository customerOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final CustomUserDetailsService customUserDetailsService;
    private final String razorpayKeyId;
    private final String razorpayKeySecret;

    public OrderService(
            CartItemRepository cartItemRepository,
            CustomerOrderRepository customerOrderRepository,
            OrderItemRepository orderItemRepository,
            UserRepository userRepository,
            JwtService jwtService,
            CustomUserDetailsService customUserDetailsService,
            @Value("${razorpay.key-id}") String razorpayKeyId,
            @Value("${razorpay.key-secret}") String razorpayKeySecret
    ) {
        this.cartItemRepository = cartItemRepository;
        this.customerOrderRepository = customerOrderRepository;
        this.orderItemRepository = orderItemRepository;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.customUserDetailsService = customUserDetailsService;
        this.razorpayKeyId = razorpayKeyId;
        this.razorpayKeySecret = razorpayKeySecret;
    }

    public RazorpayOrderResponse createRazorpayOrder(CreateRazorpayOrderRequest request, String authHeader) {
        User user = getCurrentUser(authHeader);
        AddressRequest address = validateAddress(request.getAddress());
        List<CartItem> cartItems = getCartItems(user.getId());
        PriceBreakdown priceBreakdown = calculatePrice(cartItems, request.getCouponCode());

        int amountInPaise = (int) Math.round(priceBreakdown.finalAmount * 100);
        String receipt = "order_rcpt_" + System.currentTimeMillis();
        String payload = "{\"amount\":" + amountInPaise + ",\"currency\":\"INR\",\"receipt\":\"" + receipt + "\"}";

        try {
            String authValue = Base64.getEncoder()
                    .encodeToString((razorpayKeyId + ":" + razorpayKeySecret).getBytes(StandardCharsets.UTF_8));

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.razorpay.com/v1/orders"))
                    .header("Authorization", "Basic " + authValue)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to create Razorpay order");
            }

            String razorpayOrderId = extractJsonValue(response.body(), "id");
            return new RazorpayOrderResponse(
                    razorpayOrderId,
                    razorpayKeyId,
                    amountInPaise,
                    "INR",
                    priceBreakdown.totalMrp,
                    priceBreakdown.couponDiscount,
                    priceBreakdown.platformFee,
                    priceBreakdown.finalAmount
            );
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to create Razorpay order");
        }
    }

    public CustomerOrder confirmOrder(ConfirmOrderRequest request, String authHeader) {
        User user = getCurrentUser(authHeader);
        AddressRequest address = validateAddress(request.getAddress());
        List<CartItem> cartItems = getCartItems(user.getId());
        PriceBreakdown priceBreakdown = calculatePrice(cartItems, request.getCouponCode());

        if (!isSignatureValid(
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature()
        )) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid payment signature");
        }

        CustomerOrder order = CustomerOrder.builder()
                .userId(user.getId())
                .razorpayOrderId(request.getRazorpayOrderId())
                .razorpayPaymentId(request.getRazorpayPaymentId())
                .status("PAID")
                .totalMrp(priceBreakdown.totalMrp)
                .couponDiscount(priceBreakdown.couponDiscount)
                .platformFee(priceBreakdown.platformFee)
                .finalAmount(priceBreakdown.finalAmount)
                .couponCode(normalizeCoupon(request.getCouponCode()))
                .fullName(address.getFullName())
                .phone(address.getPhone())
                .pincode(address.getPincode())
                .addressLine(address.getAddressLine())
                .city(address.getCity())
                .state(address.getState())
                .latitude(address.getLatitude())
                .longitude(address.getLongitude())
                .createdAt(LocalDateTime.now())
                .build();

        CustomerOrder savedOrder = customerOrderRepository.save(order);

        for (CartItem cartItem : cartItems) {
            String imageUrl = cartItem.getProduct().getImageUrl();
            String primaryImage = imageUrl == null ? null : imageUrl.split(",")[0].trim();
            orderItemRepository.save(OrderItem.builder()
                    .order(savedOrder)
                    .productId(cartItem.getProduct().getId())
                    .productName(cartItem.getProduct().getName())
                    .imageUrl(primaryImage)
                    .price(cartItem.getProduct().getPrice())
                    .quantity(cartItem.getQuantity())
                    .build());
        }

        cartItemRepository.deleteAll(cartItems);
        return savedOrder;
    }

    public Set<Long> getPurchasedProductIds(String authHeader) {
        User user = getCurrentUser(authHeader);
        return orderItemRepository.findByOrderUserId(user.getId())
                .stream()
                .map(OrderItem::getProductId)
                .collect(java.util.stream.Collectors.toSet());
    }

    private List<CartItem> getCartItems(Long userId) {
        List<CartItem> cartItems = cartItemRepository.findByUserId(userId);
        if (cartItems.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }
        return cartItems;
    }

    private AddressRequest validateAddress(AddressRequest address) {
        if (address == null
                || isBlank(address.getFullName())
                || isBlank(address.getPhone())
                || isBlank(address.getPincode())
                || isBlank(address.getAddressLine())
                || isBlank(address.getCity())
                || isBlank(address.getState())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Address is required");
        }
        return address;
    }

    private PriceBreakdown calculatePrice(List<CartItem> items, String couponCode) {
        double totalMrp = items.stream()
                .mapToDouble(item -> item.getProduct().getPrice() * item.getQuantity())
                .sum();

        double couponDiscount = 0;
        String normalizedCoupon = normalizeCoupon(couponCode);
        if ("SAVE10".equals(normalizedCoupon)) {
            couponDiscount = Math.min(totalMrp * 0.10, 250);
        } else if ("NEWUSER100".equals(normalizedCoupon)) {
            couponDiscount = Math.min(100, totalMrp);
        }

        double platformFee = items.isEmpty() ? 0 : 20;
        double finalAmount = Math.max(1, totalMrp - couponDiscount + platformFee);

        return new PriceBreakdown(totalMrp, couponDiscount, platformFee, finalAmount);
    }

    private boolean isSignatureValid(String orderId, String paymentId, String signature) {
        if (isBlank(orderId) || isBlank(paymentId) || isBlank(signature)) {
            return false;
        }

        try {
            String payload = orderId + "|" + paymentId;
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(
                    razorpayKeySecret.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            );
            sha256Hmac.init(secretKey);
            byte[] hash = sha256Hmac.doFinal(payload.getBytes(StandardCharsets.UTF_8));

            StringBuilder expected = new StringBuilder();
            for (byte b : hash) {
                expected.append(String.format("%02x", b));
            }

            return expected.toString().equals(signature);
        } catch (Exception ex) {
            return false;
        }
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
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
        }
    }

    private String normalizeCoupon(String couponCode) {
        return couponCode == null ? "" : couponCode.trim().toUpperCase();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String extractJsonValue(String json, String key) {
        String marker = "\"" + key + "\":";
        int start = json.indexOf(marker);
        if (start < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Invalid Razorpay response");
        }

        int valueStart = json.indexOf("\"", start + marker.length()) + 1;
        int valueEnd = json.indexOf("\"", valueStart);
        return json.substring(valueStart, valueEnd);
    }

    private static class PriceBreakdown {
        private final double totalMrp;
        private final double couponDiscount;
        private final double platformFee;
        private final double finalAmount;

        private PriceBreakdown(double totalMrp, double couponDiscount, double platformFee, double finalAmount) {
            this.totalMrp = totalMrp;
            this.couponDiscount = couponDiscount;
            this.platformFee = platformFee;
            this.finalAmount = finalAmount;
        }
    }
}
