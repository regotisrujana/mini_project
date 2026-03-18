package com.ecommerce.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.ecommerce.backend.dto.AddressRequest;
import com.ecommerce.backend.entity.SavedAddress;
import com.ecommerce.backend.entity.User;
import com.ecommerce.backend.repository.SavedAddressRepository;
import com.ecommerce.backend.repository.UserRepository;
import com.ecommerce.backend.security.JwtService;

@Service
public class SavedAddressService {

    private final SavedAddressRepository savedAddressRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final CustomUserDetailsService customUserDetailsService;

    public SavedAddressService(
            SavedAddressRepository savedAddressRepository,
            UserRepository userRepository,
            JwtService jwtService,
            CustomUserDetailsService customUserDetailsService
    ) {
        this.savedAddressRepository = savedAddressRepository;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.customUserDetailsService = customUserDetailsService;
    }

    public List<SavedAddress> getAddresses(String authHeader) {
        User user = getCurrentUser(authHeader);
        return savedAddressRepository.findByUserIdOrderByUpdatedAtDesc(user.getId());
    }

    public SavedAddress createAddress(AddressRequest request, String authHeader) {
        User user = getCurrentUser(authHeader);
        validateAddress(request);

        LocalDateTime now = LocalDateTime.now();
        SavedAddress savedAddress = SavedAddress.builder()
                .userId(user.getId())
                .label(isBlank(request.getLabel()) ? "Address" : request.getLabel().trim())
                .fullName(request.getFullName().trim())
                .phone(request.getPhone().trim())
                .pincode(request.getPincode().trim())
                .addressLine(request.getAddressLine().trim())
                .city(request.getCity().trim())
                .state(request.getState().trim())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .createdAt(now)
                .updatedAt(now)
                .build();

        return savedAddressRepository.save(savedAddress);
    }

    private void validateAddress(AddressRequest address) {
        if (address == null
                || isBlank(address.getFullName())
                || isBlank(address.getPhone())
                || isBlank(address.getPincode())
                || isBlank(address.getAddressLine())
                || isBlank(address.getCity())
                || isBlank(address.getState())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Address is required");
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

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
