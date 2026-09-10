package com.barberflow.servicecatalog;

import com.barberflow.auth.BarberFlowPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/services")
public class ServiceCatalogController {

    private final ServiceCatalogManager serviceCatalogManager;

    public ServiceCatalogController(ServiceCatalogManager serviceCatalogManager) {
        this.serviceCatalogManager = serviceCatalogManager;
    }

    @GetMapping
    public List<ServiceResponse> list(@AuthenticationPrincipal BarberFlowPrincipal principal) {
        return serviceCatalogManager.list(principal.barbershopId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceResponse create(
            @AuthenticationPrincipal BarberFlowPrincipal principal,
            @Valid @RequestBody ServiceUpsertRequest request
    ) {
        return serviceCatalogManager.create(principal.barbershopId(), request);
    }

    @PutMapping("/{serviceId}")
    public ServiceResponse update(
            @AuthenticationPrincipal BarberFlowPrincipal principal,
            @PathVariable UUID serviceId,
            @Valid @RequestBody ServiceUpsertRequest request
    ) {
        return serviceCatalogManager.update(principal.barbershopId(), serviceId, request);
    }

    @DeleteMapping("/{serviceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal BarberFlowPrincipal principal,
            @PathVariable UUID serviceId
    ) {
        serviceCatalogManager.delete(principal.barbershopId(), serviceId);
    }
}
