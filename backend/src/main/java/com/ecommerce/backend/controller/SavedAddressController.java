package com.ecommerce.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.backend.dto.AddressRequest;
import com.ecommerce.backend.entity.SavedAddress;
import com.ecommerce.backend.service.SavedAddressService;

@RestController
@RequestMapping("/api/addresses")
public class SavedAddressController {

    private final SavedAddressService savedAddressService;

    public SavedAddressController(SavedAddressService savedAddressService) {
        this.savedAddressService = savedAddressService;
    }

    @GetMapping
    public List<SavedAddress> getAddresses(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return savedAddressService.getAddresses(authHeader);
    }

    @PostMapping
    public SavedAddress createAddress(
            @RequestBody AddressRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return savedAddressService.createAddress(request, authHeader);
    }
}
