package com.barberflow.barbershop;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "barbershop_images")
public class BarbershopImage {
    @Id @Column(length = 48) private String id;
    @Column(name = "barbershop_id", nullable = false) private UUID barbershopId;
    @Column(nullable = false, length = 5) private String kind;
    @Column(name = "image_data", nullable = false, columnDefinition = "bytea") private byte[] data;
    protected BarbershopImage() {}
    public BarbershopImage(UUID barbershopId, String kind, byte[] data) {
        this.id = key(barbershopId, kind);
        this.barbershopId = barbershopId;
        this.kind = kind;
        this.data = data;
    }
    public static String key(UUID shopId, String kind) { return shopId + ":" + kind; }
    public byte[] getData() { return data; }
}
