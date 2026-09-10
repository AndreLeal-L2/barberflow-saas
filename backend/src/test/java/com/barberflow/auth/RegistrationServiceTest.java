package com.barberflow.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.barberflow.barber.Barber;
import com.barberflow.barber.BarberRepository;
import com.barberflow.barbershop.Barbershop;
import com.barberflow.barbershop.BarbershopRepository;
import com.barberflow.barbershop.SlugGenerator;
import com.barberflow.shared.error.ResourceConflictException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class RegistrationServiceTest {

    @Mock
    private AppUserRepository userRepository;

    @Mock
    private BarbershopRepository barbershopRepository;

    @Mock
    private BarberRepository barberRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private final SlugGenerator slugGenerator = new SlugGenerator();

    @Test
    void createsBarbershopAndOwnerWithNormalizedData() {
        RegistrationService service = createService();
        when(passwordEncoder.encode("securepass")).thenReturn("encoded-password");
        when(barbershopRepository.existsBySlug("barbearia-central")).thenReturn(false);

        BarberFlowPrincipal principal = service.register(new RegisterRequest(
                "  João Silva  ",
                "  Barbearia Central  ",
                "  JOAO@EXAMPLE.COM  ",
                "+351 912 345 678",
                "securepass"
        ));

        ArgumentCaptor<AppUser> userCaptor = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).save(userCaptor.capture());

        AppUser owner = userCaptor.getValue();
        assertThat(owner.getName()).isEqualTo("João Silva");
        assertThat(owner.getEmail()).isEqualTo("joao@example.com");
        assertThat(owner.getPasswordHash()).isEqualTo("encoded-password");
        assertThat(owner.getBarbershop().getSlug()).isEqualTo("barbearia-central");
        assertThat(principal.getUsername()).isEqualTo("joao@example.com");
        verify(barberRepository).save(any(Barber.class));
    }

    @Test
    void addsSuffixWhenSlugAlreadyExists() {
        RegistrationService service = createService();
        when(passwordEncoder.encode("securepass")).thenReturn("encoded-password");
        when(barbershopRepository.existsBySlug("barbearia-central")).thenReturn(true);
        when(barbershopRepository.existsBySlug("barbearia-central-2")).thenReturn(false);

        service.register(validRequest());

        ArgumentCaptor<Barbershop> captor = ArgumentCaptor.forClass(Barbershop.class);
        verify(barbershopRepository).save(captor.capture());
        assertThat(captor.getValue().getSlug()).isEqualTo("barbearia-central-2");
    }

    @Test
    void rejectsExistingEmailBeforeWritingData() {
        RegistrationService service = createService();
        when(userRepository.existsByEmailIgnoreCase("joao@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.register(validRequest()))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessage("Já existe uma conta com este e-mail.");

        verify(barbershopRepository, never()).save(any());
        verify(userRepository, never()).save(any());
    }

    private RegistrationService createService() {
        return new RegistrationService(
                userRepository,
                barbershopRepository,
                barberRepository,
                passwordEncoder,
                slugGenerator
        );
    }

    private RegisterRequest validRequest() {
        return new RegisterRequest(
                "João Silva",
                "Barbearia Central",
                "joao@example.com",
                "+351 912 345 678",
                "securepass"
        );
    }
}
