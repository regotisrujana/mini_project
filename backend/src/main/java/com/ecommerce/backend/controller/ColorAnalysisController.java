package com.ecommerce.backend.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.ecommerce.backend.dto.ColorAnalysisResponse;
import com.ecommerce.backend.service.ColorAnalysisService;

@RestController
@RequestMapping("/api/color-analysis")
@CrossOrigin(origins = "http://localhost:3000")
public class ColorAnalysisController {

    private final ColorAnalysisService colorAnalysisService;

    public ColorAnalysisController(ColorAnalysisService colorAnalysisService) {
        this.colorAnalysisService = colorAnalysisService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ColorAnalysisResponse analyze(@RequestPart("image") MultipartFile image) {
        return colorAnalysisService.analyze(image);
    }
}
