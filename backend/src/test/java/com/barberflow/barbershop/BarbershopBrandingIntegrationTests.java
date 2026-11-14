package com.barberflow.barbershop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.barberflow.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@Import({TestcontainersConfiguration.class, BarbershopBrandingIntegrationTests.BrandingTestDatabase.class})
@SpringBootTest
@AutoConfigureMockMvc
class BarbershopBrandingIntegrationTests {
    @Autowired private MockMvc mvc;
    @Autowired private BarbershopRepository shops;
    @Autowired private PlatformTransactionManager transactions;

    @Test
    void shouldUploadPersistPublishAndRemoveTenantImages() throws Exception {
        Account owner = register();
        MvcResult upload = mvc.perform(multipart(HttpMethod.PUT, "/api/dashboard/barbershop/images/logo")
                .file(png()).cookie(owner.session(), owner.csrf()).header("X-XSRF-TOKEN", owner.csrf().getValue()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.logoUrl").isString()).andReturn();
        String logoUrl = JsonPath.read(upload.getResponse().getContentAsString(), "$.logoUrl");
        mvc.perform(get("/api/dashboard/barbershop").cookie(owner.session()))
                .andExpect(jsonPath("$.logoUrl").value(logoUrl));
        byte[] stored = mvc.perform(get(logoUrl).cookie(owner.session())).andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG)).andReturn().getResponse().getContentAsByteArray();
        assertThat(ImageIO.read(new ByteArrayInputStream(stored)).getWidth()).isEqualTo(12);
        mvc.perform(get("/api/public/barbershops/" + owner.slug() + "/images/logo"))
                .andExpect(status().isNotFound());
        Account other = register();
        mvc.perform(get(logoUrl).cookie(other.session())).andExpect(status().isNotFound());

        mvc.perform(multipart(HttpMethod.PUT, "/api/dashboard/barbershop/images/cover").file(png())
                .cookie(owner.session(), owner.csrf()).header("X-XSRF-TOKEN", owner.csrf().getValue()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.coverImageUrl").isString());
        json(owner, HttpMethod.POST, "/api/dashboard/services", "{\"name\":\"Corte\",\"durationMinutes\":30,\"priceAmount\":15}", 201);
        json(owner, HttpMethod.PUT, "/api/dashboard/availability", "{\"days\":[{\"dayOfWeek\":\"MONDAY\",\"startTime\":\"09:00\",\"endTime\":\"18:00\"}]}", 200);
        json(owner, HttpMethod.PATCH, "/api/dashboard/barbershop/publication", "{\"published\":true}", 200);
        MvcResult publicPage = mvc.perform(get("/api/public/barbershops/" + owner.slug()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.logoUrl").isString())
                .andExpect(jsonPath("$.coverImageUrl").isString()).andReturn();
        String publicLogo = JsonPath.read(publicPage.getResponse().getContentAsString(), "$.logoUrl");
        mvc.perform(get(publicLogo)).andExpect(status().isOk()).andExpect(content().contentType(MediaType.IMAGE_PNG));
        json(owner, HttpMethod.PATCH, "/api/dashboard/barbershop/publication", "{\"published\":false}", 200);
        mvc.perform(get(publicLogo)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/dashboard/barbershop/images/logo").cookie(owner.session(), owner.csrf())
                .header("X-XSRF-TOKEN", owner.csrf().getValue())).andExpect(status().isOk())
                .andExpect(jsonPath("$.logoUrl").isEmpty());
        mvc.perform(get(logoUrl).cookie(owner.session())).andExpect(status().isNotFound());
    }

    @Test
    void rejectsInvalidOrOversizedImagesWithoutReplacingTheSavedLogo() throws Exception {
        Account owner = register();
        mvc.perform(multipart(HttpMethod.PUT, "/api/dashboard/barbershop/images/logo").file(png())
                .cookie(owner.session(), owner.csrf()).header("X-XSRF-TOKEN", owner.csrf().getValue()))
                .andExpect(status().isOk());
        for (MockMultipartFile file : new MockMultipartFile[] {
                new MockMultipartFile("file", "fake.png", "image/png", "not an image".getBytes()),
                new MockMultipartFile("file", "vector.svg", "image/svg+xml", "<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes()),
                new MockMultipartFile("file", "large.png", "image/png", new byte[5 * 1024 * 1024 + 1])
        }) {
            mvc.perform(multipart(HttpMethod.PUT, "/api/dashboard/barbershop/images/logo").file(file)
                    .cookie(owner.session(), owner.csrf()).header("X-XSRF-TOKEN", owner.csrf().getValue()))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/dashboard/barbershop/images/logo").cookie(owner.session())).andExpect(status().isOk());
    }

    @Test
    void requiresAuthenticationAndCsrfForImageChanges() throws Exception {
        Cookie csrf = mvc.perform(get("/api/auth/csrf")).andReturn().getResponse().getCookie("XSRF-TOKEN");
        mvc.perform(multipart(HttpMethod.PUT, "/api/dashboard/barbershop/images/logo").file(png())
                .cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue())).andExpect(status().isUnauthorized());
        mvc.perform(multipart(HttpMethod.PUT, "/api/dashboard/barbershop/images/logo").file(png()))
                .andExpect(status().isForbidden());
    }

    @Test
    void savingAnOlderProfileDoesNotEraseAnImageUploadedInAnotherTab() throws Exception {
        Account owner = register();
        CountDownLatch profileRead = new CountDownLatch(1);
        CountDownLatch resumeSave = new CountDownLatch(1);
        CompletableFuture<Void> save = CompletableFuture.runAsync(() ->
                new TransactionTemplate(transactions).executeWithoutResult(transaction -> {
                    Barbershop shop = shops.findBySlugAndActiveTrue(owner.slug()).orElseThrow();
                    profileRead.countDown();
                    try {
                        if (!resumeSave.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Save not released");
                    } catch (InterruptedException exception) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException(exception);
                    }
                    shop.updatePublicProfile("Perfil guardado", null);
                }));
        assertThat(profileRead.await(10, TimeUnit.SECONDS)).isTrue();
        try {
            mvc.perform(multipart(HttpMethod.PUT, "/api/dashboard/barbershop/images/logo").file(png())
                    .cookie(owner.session(), owner.csrf()).header("X-XSRF-TOKEN", owner.csrf().getValue()))
                    .andExpect(status().isOk());
        } finally { resumeSave.countDown(); }
        save.get(10, TimeUnit.SECONDS);
        mvc.perform(get("/api/dashboard/barbershop").cookie(owner.session()))
                .andExpect(jsonPath("$.publicDescription").value("Perfil guardado"))
                .andExpect(jsonPath("$.logoUrl").isString());
    }

    private MockMultipartFile png() throws Exception {
        BufferedImage image = new BufferedImage(12, 8, BufferedImage.TYPE_INT_ARGB);
        image.setRGB(1, 1, 0xff344e41);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return new MockMultipartFile("file", "logo.png", "image/png", output.toByteArray());
    }

    private Account register() throws Exception {
        Cookie csrf = mvc.perform(get("/api/auth/csrf")).andReturn().getResponse().getCookie("XSRF-TOKEN");
        String id = UUID.randomUUID().toString();
        MvcResult result = mvc.perform(post("/api/auth/register").cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue())
                .contentType(MediaType.APPLICATION_JSON).content("""
                {"ownerName":"Profissional teste","barbershopName":"Studio %s","email":"%s@example.test","phone":"+351 910 000 002","password":"TesteSeguro2026!"}
                """.formatted(id, id))).andExpect(status().isCreated()).andReturn();
        return new Account(result.getResponse().getCookie("BARBERFLOW_SESSION"), csrf,
                JsonPath.read(result.getResponse().getContentAsString(), "$.barbershop.slug"));
    }

    private void json(Account owner, HttpMethod method, String path, String body, int statusCode) throws Exception {
        mvc.perform(request(method, path).cookie(owner.session(), owner.csrf())
                .header("X-XSRF-TOKEN", owner.csrf().getValue()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(statusCode));
    }
    // A separate Spring context gives this suite its own real PostgreSQL container and rate-limit buckets.
    @org.springframework.boot.test.context.TestConfiguration(proxyBeanMethods = false)
    static class BrandingTestDatabase {}

    private record Account(Cookie session, Cookie csrf, String slug) {}
}
