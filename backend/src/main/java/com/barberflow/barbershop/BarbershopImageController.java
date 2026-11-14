package com.barberflow.barbershop;

import com.barberflow.auth.BarberFlowPrincipal;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class BarbershopImageController {
    private final BarbershopImageService images;
    private final BarbershopManager manager;
    public BarbershopImageController(BarbershopImageService images, BarbershopManager manager) {
        this.images = images;
        this.manager = manager;
    }
    @PutMapping(value = "/api/dashboard/barbershop/images/{kind}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public BarbershopDashboardResponse upload(@AuthenticationPrincipal BarberFlowPrincipal owner,
            @PathVariable String kind, @RequestParam("file") MultipartFile file) {
        images.upload(owner.barbershopId(), kind, file);
        return manager.get(owner.barbershopId());
    }
    @DeleteMapping("/api/dashboard/barbershop/images/{kind}")
    public BarbershopDashboardResponse remove(@AuthenticationPrincipal BarberFlowPrincipal owner, @PathVariable String kind) {
        images.remove(owner.barbershopId(), kind);
        return manager.get(owner.barbershopId());
    }
    @GetMapping("/api/dashboard/barbershop/images/{kind}")
    public ResponseEntity<byte[]> privateImage(@AuthenticationPrincipal BarberFlowPrincipal owner, @PathVariable String kind) {
        return response(images.getPrivate(owner.barbershopId(), kind));
    }
    @GetMapping("/api/public/barbershops/{slug}/images/{kind}")
    public ResponseEntity<byte[]> publicImage(@PathVariable String slug, @PathVariable String kind) {
        return response(images.getPublic(slug, kind));
    }
    private ResponseEntity<byte[]> response(byte[] bytes) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_PNG)
                .header("X-Content-Type-Options", "nosniff").body(bytes);
    }
}
