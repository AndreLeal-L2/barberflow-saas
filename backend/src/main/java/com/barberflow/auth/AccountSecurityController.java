package com.barberflow.auth;

import com.barberflow.config.RequestRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AccountSecurityController {

    private final AccountSecurityService accountSecurityService;
    private final RequestRateLimiter requestRateLimiter;

    public AccountSecurityController(
            AccountSecurityService accountSecurityService,
            RequestRateLimiter requestRateLimiter
    ) {
        this.accountSecurityService = accountSecurityService;
        this.requestRateLimiter = requestRateLimiter;
    }

    @PostMapping("/verification/confirm")
    public MessageResponse verifyEmail(
            @Valid @RequestBody TokenRequest request,
            HttpServletRequest httpRequest
    ) {
        requestRateLimiter.checkTokenAttempt(httpRequest);
        accountSecurityService.verifyEmail(request.token());
        return new MessageResponse("E-mail confirmado com sucesso.");
    }

    @PostMapping("/verification/resend")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public MessageResponse resendVerification(
            @AuthenticationPrincipal BarberFlowPrincipal principal,
            HttpServletRequest httpRequest
    ) {
        requestRateLimiter.checkVerificationResend(httpRequest, principal.getUsername());
        accountSecurityService.sendVerification(principal.userId());
        return new MessageResponse("Enviámos um novo link de confirmação.");
    }

    @PostMapping("/password/forgot")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public MessageResponse forgotPassword(
            @Valid @RequestBody EmailRequest request,
            HttpServletRequest httpRequest
    ) {
        requestRateLimiter.checkPasswordRecovery(httpRequest, request.email());
        accountSecurityService.requestPasswordReset(request.email());
        return new MessageResponse(
                "Se existir uma conta com esse e-mail, receberá um link de recuperação."
        );
    }

    @PostMapping("/password/reset")
    public MessageResponse resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        requestRateLimiter.checkTokenAttempt(httpRequest);
        accountSecurityService.resetPassword(request.token(), request.password());
        return new MessageResponse("Palavra-passe atualizada. Já pode iniciar sessão.");
    }
}
