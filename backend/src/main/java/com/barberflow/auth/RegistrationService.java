package com.barberflow.auth;

import com.barberflow.barber.Barber;
import com.barberflow.barber.BarberRepository;
import com.barberflow.barbershop.Barbershop;
import com.barberflow.barbershop.BarbershopRepository;
import com.barberflow.barbershop.SlugGenerator;
import com.barberflow.shared.error.ResourceConflictException;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationService {

    private final AppUserRepository userRepository;
    private final BarbershopRepository barbershopRepository;
    private final BarberRepository barberRepository;
    private final PasswordEncoder passwordEncoder;
    private final SlugGenerator slugGenerator;

    public RegistrationService(
            AppUserRepository userRepository,
            BarbershopRepository barbershopRepository,
            BarberRepository barberRepository,
            PasswordEncoder passwordEncoder,
            SlugGenerator slugGenerator
    ) {
        this.userRepository = userRepository;
        this.barbershopRepository = barbershopRepository;
        this.barberRepository = barberRepository;
        this.passwordEncoder = passwordEncoder;
        this.slugGenerator = slugGenerator;
    }

    @Transactional
    public BarberFlowPrincipal register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResourceConflictException(
                    "EMAIL_ALREADY_REGISTERED",
                    "Já existe uma conta com este e-mail."
            );
        }

        String slug = nextAvailableSlug(request.barbershopName());
        Barbershop barbershop = Barbershop.create(
                request.barbershopName().trim(),
                slug,
                request.phone().trim(),
                email
        );
        barbershopRepository.save(barbershop);

        AppUser owner = AppUser.createOwner(
                barbershop,
                request.ownerName().trim(),
                email,
                passwordEncoder.encode(request.password())
        );
        userRepository.save(owner);
        barberRepository.save(Barber.createOwner(barbershop, owner.getName()));

        return BarberFlowPrincipal.from(owner);
    }

    private String nextAvailableSlug(String barbershopName) {
        String baseSlug = slugGenerator.from(barbershopName);
        String candidate = baseSlug;
        int suffix = 2;

        while (barbershopRepository.existsBySlug(candidate)) {
            candidate = baseSlug + "-" + suffix;
            suffix++;
        }

        return candidate;
    }
}
