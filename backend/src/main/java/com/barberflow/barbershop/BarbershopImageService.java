package com.barberflow.barbershop;

import com.barberflow.shared.error.BusinessRuleException;
import com.barberflow.shared.error.ResourceNotFoundException;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class BarbershopImageService {
    private static final long MAX_BYTES = 5 * 1024 * 1024;
    private final BarbershopRepository shops;
    private final BarbershopImageRepository images;
    public BarbershopImageService(BarbershopRepository shops, BarbershopImageRepository images) {
        this.shops = shops;
        this.images = images;
    }

    @Transactional
    public void upload(UUID shopId, String kind, MultipartFile file) {
        validateKind(kind);
        byte[] data = normalize(file, kind.equals("logo") ? 512 : 1600);
        Barbershop shop = shops.findForImageUpdate(shopId).orElseThrow(BarbershopImageService::notFound);
        images.save(new BarbershopImage(shopId, kind, data));
        shop.setImageVersion(kind, UUID.randomUUID());
    }

    @Transactional
    public void remove(UUID shopId, String kind) {
        validateKind(kind);
        Barbershop shop = shops.findForImageUpdate(shopId).orElseThrow(BarbershopImageService::notFound);
        images.deleteById(BarbershopImage.key(shopId, kind));
        shop.setImageVersion(kind, null);
    }

    @Transactional(readOnly = true)
    public byte[] getPrivate(UUID shopId, String kind) {
        validateKind(kind);
        return image(shopId, kind);
    }

    @Transactional(readOnly = true)
    public byte[] getPublic(String slug, String kind) {
        validateKind(kind);
        Barbershop shop = shops.findBySlugAndActiveTrue(slug)
                .filter(Barbershop::isPublished)
                .filter(value -> value.getSubscriptionStatus().grantsBookingAccess())
                .orElseThrow(BarbershopImageService::notFound);
        return image(shop.getId(), kind);
    }

    private byte[] image(UUID shopId, String kind) {
        return images.findById(BarbershopImage.key(shopId, kind)).orElseThrow(BarbershopImageService::notFound).getData();
    }

    private byte[] normalize(MultipartFile file, int maxDimension) {
        if (file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw invalid("Escolha uma imagem PNG ou JPEG até 5 MB.");
        }
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalid("O ficheiro não é uma imagem PNG ou JPEG válida.");
            ImageReader reader = readers.next();
            try {
                String format = reader.getFormatName();
                if (!format.equalsIgnoreCase("png") && !format.equalsIgnoreCase("jpeg")) {
                    throw invalid("Escolha uma imagem PNG ou JPEG.");
                }
                reader.setInput(input, true, true);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width < 1 || height < 1 || (long) width * height > 16_000_000) {
                    throw invalid("A imagem deve ter no máximo 16 milhões de píxeis.");
                }
                BufferedImage source = reader.read(0);
                double scale = Math.min(1.0, (double) maxDimension / Math.max(width, height));
                BufferedImage normalized = new BufferedImage(Math.max(1, (int) (width * scale)),
                        Math.max(1, (int) (height * scale)), BufferedImage.TYPE_INT_ARGB);
                Graphics2D graphics = normalized.createGraphics();
                try {
                    graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                    graphics.drawImage(source, 0, 0, normalized.getWidth(), normalized.getHeight(), null);
                } finally { graphics.dispose(); }
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                ImageIO.write(normalized, "png", output);
                if (output.size() > MAX_BYTES) throw invalid("A imagem é demasiado complexa. Escolha uma imagem mais pequena.");
                return output.toByteArray();
            } finally { reader.dispose(); }
        } catch (IOException | IllegalArgumentException exception) {
            throw invalid("O ficheiro não é uma imagem PNG ou JPEG válida.");
        }
    }
    private static void validateKind(String kind) {
        if (!kind.equals("logo") && !kind.equals("cover")) throw invalid("Tipo de imagem inválido.");
    }
    private static BusinessRuleException invalid(String message) {
        return new BusinessRuleException(HttpStatus.BAD_REQUEST, "IMAGE_INVALID", message);
    }
    private static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("IMAGE_NOT_FOUND", "A imagem não está disponível.");
    }
}
