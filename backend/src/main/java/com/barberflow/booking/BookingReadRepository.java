package com.barberflow.booking;

import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class BookingReadRepository {
    private final EntityManager entityManager;

    public BookingReadRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public List<Booking> inRange(UUID shopId, LocalDateTime from, LocalDateTime to) {
        return entityManager.createQuery("""
                select b from Booking b join fetch b.barber
                where b.barbershop.id = :shop and b.startAt < :to and b.endAt > :from
                order by b.startAt, b.id
                """, Booking.class).setParameter("shop", shopId).setParameter("from", from)
                .setParameter("to", to).getResultList();
    }

    public List<Booking> page(UUID shopId, LocalDateTime now, String view, int page, int size) {
        String condition = switch (view) {
            case "history" -> "(b.status <> :confirmed or b.endAt < :now)";
            case "next" -> "b.status = :confirmed and b.startAt >= :now";
            default -> "b.status = :confirmed and b.endAt >= :now";
        };
        String order = view.equals("history") ? "b.startAt desc, b.id desc" : "b.startAt, b.id";
        // One extra row signals another page without a separate count query.
        return entityManager.createQuery("select b from Booking b join fetch b.barber "
                + "where b.barbershop.id = :shop and " + condition + " order by " + order, Booking.class)
                .setParameter("shop", shopId).setParameter("now", now)
                .setParameter("confirmed", BookingStatus.CONFIRMED)
                .setFirstResult(Math.multiplyExact(page, size)).setMaxResults(size + 1).getResultList();
    }
}
