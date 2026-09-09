package com.barberflow.barbershop;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BarbershopRepository extends JpaRepository<Barbershop, UUID> {
    boolean existsBySlug(String slug);
}
