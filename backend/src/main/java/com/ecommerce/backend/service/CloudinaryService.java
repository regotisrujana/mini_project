package com.ecommerce.backend.service;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public String uploadImage(MultipartFile file) {
        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap("resource_type", "image")
            );

            Object secureUrl = uploadResult.get("secure_url");
            if (secureUrl == null) {
                throw new RuntimeException("Cloudinary upload did not return a secure URL");
            }

            return secureUrl.toString();
        } catch (IOException ex) {
            throw new RuntimeException("Failed to upload image to Cloudinary", ex);
        }
    }

    public List<String> uploadImages(MultipartFile[] files) {
        java.util.List<String> uploadedUrls = new java.util.ArrayList<>();

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }

            try {
                uploadedUrls.add(uploadImage(file));
            } catch (Exception ex) {
                // Keep product creation working even if one image upload is rejected upstream.
            }
        }

        return uploadedUrls;
    }
}
