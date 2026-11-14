package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.service.udise.UdiseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;

@Tag(name = "Admin: UDISE+", description = "UDISE+ codes and Know Your School links for school profiles")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@RestController
public class AdminUdiseController {

    private final UdiseService udise;

    public AdminUdiseController(UdiseService udise) {
        this.udise = udise;
    }

    @Operation(summary = "Set one school's checked UDISE+ code and Know Your School link (ADMIN or EDITOR). Send nulls to clear")
    @PutMapping("/api/v1/admin/schools/{id}/udise")
    public UdiseService.LinkResult setLink(@PathVariable long id, @RequestBody UdiseService.LinkRequest request) {
        return udise.setLink(id, request);
    }

    @Operation(summary = "Match an official UDISE+ school list (CSV) against the directory (ADMIN only). A dry run unless apply=true; "
            + "when applied, only unambiguous matches are written, to schools without a code")
    @PostMapping("/api/v1/admin/import/udise")
    public UdiseService.MatchReport match(@RequestPart("file") MultipartFile file,
                                          @RequestParam(defaultValue = "false") boolean apply) throws IOException {
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)) {
            return udise.match(reader, apply);
        }
    }
}
