package com.barberflow.auth;

import java.util.Locale;
import java.util.UUID;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BarberFlowUserDetailsService implements UserDetailsService {

    private final AppUserRepository userRepository;

    public BarberFlowUserDetailsService(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmailIgnoreCase(email.trim().toLowerCase(Locale.ROOT))
                .map(BarberFlowPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("Utilizador não encontrado."));
    }

    @Transactional(readOnly = true)
    public BarberFlowPrincipal loadById(UUID userId) {
        return userRepository.findById(userId)
                .map(BarberFlowPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("Utilizador não encontrado."));
    }
}
