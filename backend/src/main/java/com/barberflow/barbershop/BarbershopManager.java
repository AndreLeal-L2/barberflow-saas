package com.barberflow.barbershop;

import com.barberflow.auth.AppUserRepository;
import com.barberflow.availability.AvailabilityRuleRepository;
import com.barberflow.servicecatalog.BarbershopServiceRepository;
import com.barberflow.shared.error.BusinessRuleException;
import com.barberflow.shared.error.ResourceNotFoundException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BarbershopManager {

    private final BarbershopRepository barbershopRepository;
    private final BarbershopServiceRepository serviceRepository;
    private final AvailabilityRuleRepository availabilityRepository;
    private final AppUserRepository userRepository;
    private final boolean requireEmailVerification;

    public BarbershopManager(
            BarbershopRepository barbershopRepository,
            BarbershopServiceRepository serviceRepository,
            AvailabilityRuleRepository availabilityRepository,
            AppUserRepository userRepository,
            @Value("${app.security.require-email-verification}") boolean requireEmailVerification
    ) {
        this.barbershopRepository = barbershopRepository;
        this.serviceRepository = serviceRepository;
        this.availabilityRepository = availabilityRepository;
        this.userRepository = userRepository;
        this.requireEmailVerification = requireEmailVerification;
    }

    @Transactional(readOnly = true)
    public BarbershopDashboardResponse get(UUID barbershopId) {
        return toResponse(find(barbershopId));
    }

    @Transactional
    public BarbershopDashboardResponse updateProfile(
            UUID barbershopId,
            BarbershopProfileRequest request
    ) {
        Barbershop barbershop = find(barbershopId);
        barbershop.updatePublicProfile(
                normalizeOptional(request.publicDescription()),
                normalizeOptional(request.publicAddress())
        );
        return toResponse(barbershop);
    }

    @Transactional
    public BarbershopDashboardResponse updatePublication(
            UUID barbershopId,
            PublicationRequest request
    ) {
        Barbershop barbershop = find(barbershopId);
        long serviceCount = serviceRepository.countByBarbershopIdAndActiveTrue(barbershopId);
        long availabilityCount =
                availabilityRepository.countByBarbershopIdAndActiveTrue(barbershopId);

        if (request.published() && (serviceCount == 0 || availabilityCount == 0)) {
            throw new BusinessRuleException(
                    HttpStatus.CONFLICT,
                    "BARBERSHOP_NOT_READY",
                    "Adicione pelo menos um serviço e um horário antes de publicar."
            );
        }
        if (request.published()
                && requireEmailVerification
                && !userRepository.existsByBarbershopIdAndEmailVerifiedTrue(barbershopId)) {
            throw new BusinessRuleException(
                    HttpStatus.CONFLICT,
                    "EMAIL_VERIFICATION_REQUIRED",
                    "Confirme o e-mail de administrador antes de publicar a página."
            );
        }
        if (request.published()
                && !barbershop.getSubscriptionStatus().grantsBookingAccess()) {
            throw new BusinessRuleException(
                    HttpStatus.CONFLICT,
                    "SUBSCRIPTION_INACTIVE",
                    "A subscrição não permite publicar a página."
            );
        }

        barbershop.setPublished(request.published());
        return BarbershopDashboardResponse.from(
                barbershop,
                serviceCount,
                availabilityCount
        );
    }

    private BarbershopDashboardResponse toResponse(Barbershop barbershop) {
        UUID barbershopId = barbershop.getId();
        return BarbershopDashboardResponse.from(
                barbershop,
                serviceRepository.countByBarbershopIdAndActiveTrue(barbershopId),
                availabilityRepository.countByBarbershopIdAndActiveTrue(barbershopId)
        );
    }

    private Barbershop find(UUID barbershopId) {
        return barbershopRepository.findById(barbershopId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "BARBERSHOP_NOT_FOUND",
                        "A barbearia não foi encontrada."
                ));
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
