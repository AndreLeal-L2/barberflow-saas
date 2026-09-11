package com.barberflow.availability;

import com.barberflow.auth.BarberFlowPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/availability/blocks")
public class BlockedTimeController {

    private final BlockedTimeManager blockedTimeManager;

    public BlockedTimeController(BlockedTimeManager blockedTimeManager) {
        this.blockedTimeManager = blockedTimeManager;
    }

    @GetMapping
    public List<BlockedTimeResponse> listUpcoming(
            @AuthenticationPrincipal BarberFlowPrincipal principal
    ) {
        return blockedTimeManager.listUpcoming(principal.barbershopId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BlockedTimeResponse create(
            @AuthenticationPrincipal BarberFlowPrincipal principal,
            @Valid @RequestBody CreateBlockedTimeRequest request
    ) {
        return blockedTimeManager.create(principal.barbershopId(), request);
    }

    @DeleteMapping("/{blockedTimeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal BarberFlowPrincipal principal,
            @PathVariable UUID blockedTimeId
    ) {
        blockedTimeManager.delete(principal.barbershopId(), blockedTimeId);
    }
}
