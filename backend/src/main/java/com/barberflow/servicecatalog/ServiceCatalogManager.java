package com.barberflow.servicecatalog;

import com.barberflow.barbershop.Barbershop;
import com.barberflow.barbershop.BarbershopRepository;
import com.barberflow.shared.error.ResourceNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServiceCatalogManager {

    private final BarbershopServiceRepository serviceRepository;
    private final BarbershopRepository barbershopRepository;

    public ServiceCatalogManager(
            BarbershopServiceRepository serviceRepository,
            BarbershopRepository barbershopRepository
    ) {
        this.serviceRepository = serviceRepository;
        this.barbershopRepository = barbershopRepository;
    }

    @Transactional(readOnly = true)
    public List<ServiceResponse> list(UUID barbershopId) {
        return serviceRepository
                .findAllByBarbershopIdAndActiveTrueOrderByNameAsc(barbershopId)
                .stream()
                .map(ServiceResponse::from)
                .toList();
    }

    @Transactional
    public ServiceResponse create(UUID barbershopId, ServiceUpsertRequest request) {
        Barbershop barbershop = barbershopRepository.getReferenceById(barbershopId);
        BarbershopService service = BarbershopService.create(
                barbershop,
                request.name(),
                request.description(),
                request.durationMinutes(),
                request.priceAmount()
        );
        return ServiceResponse.from(serviceRepository.save(service));
    }

    @Transactional
    public ServiceResponse update(
            UUID barbershopId,
            UUID serviceId,
            ServiceUpsertRequest request
    ) {
        BarbershopService service = findOwned(serviceId, barbershopId);
        service.update(
                request.name(),
                request.description(),
                request.durationMinutes(),
                request.priceAmount()
        );
        return ServiceResponse.from(service);
    }

    @Transactional
    public void delete(UUID barbershopId, UUID serviceId) {
        findOwned(serviceId, barbershopId).deactivate();
        serviceRepository.flush();

        if (serviceRepository.countByBarbershopIdAndActiveTrue(barbershopId) == 0) {
            barbershopRepository.getReferenceById(barbershopId).setPublished(false);
        }
    }

    private BarbershopService findOwned(UUID serviceId, UUID barbershopId) {
        return serviceRepository
                .findByIdAndBarbershopIdAndActiveTrue(serviceId, barbershopId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "SERVICE_NOT_FOUND",
                        "O serviço não foi encontrado."
                ));
    }
}
