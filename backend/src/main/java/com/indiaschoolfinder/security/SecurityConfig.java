package com.indiaschoolfinder.security;

import com.indiaschoolfinder.config.AppProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.session.DefaultCookieSerializerCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.savedrequest.NullRequestCache;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.session.security.web.authentication.SpringSessionRememberMeServices;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Clock;
import java.util.List;
import java.util.Set;

/**
 * Two security chains:
 * <ul>
 *   <li><b>Staff console</b> (/api/v1/admin, /api/v1/auth, actuator, API docs): stateless short-lived JWT bearer tokens
 *   for admin_user accounts. No cookies are involved, so CSRF does not apply. ADMIN or EDITOR; destructive or bulk
 *   operations need ADMIN.</li>
 *   <li><b>Site</b> (everything else): public, read-mostly API plus member accounts with server-side sessions (Spring
 *   Session in PostgreSQL, HttpOnly SameSite=Lax cookie, Secure in production). CSRF tokens (cookie + header) are
 *   required on every state-changing /api/v1/account request. No session is created for anonymous visitors (except
 *   briefly while "Continue with Google" is in progress, when that option is configured).</li>
 * </ul>
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    @Bean
    @Order(1)
    public SecurityFilterChain staffChain(HttpSecurity http, JwtService jwtService, AdminUserDetailsService userDetailsService,
                                          JsonSecurityErrorHandler errorHandler, AppProperties properties, Clock clock) throws Exception {
        http
                .securityMatcher("/api/v1/admin/**", "/api/v1/auth/**", "/actuator/**", "/v3/api-docs/**", "/swagger-ui/**",
                        "/swagger-ui.html")
                // Bearer tokens travel in the Authorization header, never in cookies, so CSRF cannot apply here.
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource(properties)))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(b -> b.disable())
                .formLogin(f -> f.disable())
                .headers(SecurityConfig::headers)
                .exceptionHandling(e -> e.authenticationEntryPoint(errorHandler).accessDeniedHandler(errorHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                        .requestMatchers("/actuator/**").hasRole("ADMIN")
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/admin/schools/*/status").hasRole("ADMIN")
                        .requestMatchers("/api/v1/admin/import/**", "/api/v1/admin/ranking-criteria/**",
                                "/api/v1/admin/audit-log/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/admin/**").hasAnyRole("ADMIN", "EDITOR")
                        .anyRequest().denyAll())
                .addFilterBefore(new RateLimitFilter(properties, errorHandler, clock), UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(new JwtAuthenticationFilter(jwtService, userDetailsService), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain siteChain(HttpSecurity http, JsonSecurityErrorHandler errorHandler, AppProperties properties,
                                         Clock clock, ObjectProvider<ClientRegistrationRepository> googleClient,
                                         GoogleSignInHandler googleHandler) throws Exception {
        ClientRegistrationRepository google = googleClient.getIfAvailable();
        if (google != null) {
            // "Continue with Google" exists only when a Google client is configured (see GoogleSignIn).
            http.oauth2Login(o -> o
                    .clientRegistrationRepository(google)
                    .authorizedClientRepository(new GoogleSignIn.NoStoredTokens())
                    .authorizationEndpoint(a -> a.baseUri(GoogleSignIn.AUTHORIZATION_BASE)
                            .authorizationRequestResolver(GoogleSignIn.resolver(google)))
                    .redirectionEndpoint(r -> r.baseUri(GoogleSignIn.CALLBACK_PATTERN))
                    .loginPage("/signin") // the site's own page; no generated login page
                    .successHandler(googleHandler)
                    .failureHandler(googleHandler));
        }
        CookieCsrfTokenRepository csrfRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepository.setCookieCustomizer(c -> c.sameSite("Lax"));
        RequestMatcher accountWrites = request -> !SAFE_METHODS.contains(request.getMethod())
                && request.getRequestURI().startsWith("/api/v1/account/");
        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfRepository)
                        // The single-page app sends the cookie value back as-is in X-XSRF-TOKEN.
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                        .requireCsrfProtectionMatcher(accountWrites))
                .cors(cors -> cors.configurationSource(corsConfigurationSource(properties)))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                // Do not create sessions to remember requests of anonymous visitors.
                .requestCache(rc -> rc.requestCache(new NullRequestCache()))
                .securityContext(Customizer.withDefaults())
                .httpBasic(b -> b.disable())
                .formLogin(f -> f.disable())
                .logout(l -> l.disable()) // sign-out is an explicit API call (AccountController)
                .headers(SecurityConfig::headers)
                .exceptionHandling(e -> e.authenticationEntryPoint(errorHandler).accessDeniedHandler(errorHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/account/csrf", "/api/v1/account/config",
                                "/api/v1/account/oauth2/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/account/register", "/api/v1/account/login",
                                "/api/v1/account/logout", "/api/v1/account/verify-email", "/api/v1/account/resend-verification",
                                "/api/v1/account/forgot-password", "/api/v1/account/reset-password").permitAll()
                        .requestMatchers("/api/v1/account/**").hasRole("USER")
                        .requestMatchers("/api/v1/dev/**").permitAll() // exists only when the dev outbox is enabled
                        .requestMatchers(HttpMethod.POST, "/api/v1/schools/*/reviews").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/schools/*/update-submissions").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/fees/calculate").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/practice-sets/*/score").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/robots.txt", "/sitemap.xml", "/sitemaps/*.xml").permitAll()
                        .anyRequest().denyAll())
                .addFilterBefore(new RateLimitFilter(properties, errorHandler, clock), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private static void headers(HeadersConfigurer<HttpSecurity> h) {
        h.contentTypeOptions(c -> { })
                .frameOptions(f -> f.deny())
                .referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .contentSecurityPolicy(csp -> csp.policyDirectives(
                        "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; "
                                + "script-src 'self' 'unsafe-inline'; frame-ancestors 'none'"));
    }

    /** "Keep me signed in" makes the session cookie persistent for as long as the server keeps the session. */
    @Bean
    public DefaultCookieSerializerCustomizer rememberMeCookie() {
        return serializer -> serializer.setRememberMeRequestAttribute(SpringSessionRememberMeServices.REMEMBER_ME_LOGIN_ATTR);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /** Staff (admin_user) sign-in only; members are checked by AccountService. */
    @Bean
    public AuthenticationManager authenticationManager(AdminUserDetailsService userDetailsService, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }

    private static CorsConfigurationSource corsConfigurationSource(AppProperties properties) {
        // The site and API share an origin (Vite proxy locally, nginx in production); cross-origin callers get no
        // cookies (allowCredentials=false), so a foreign page can never use a member's session.
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(properties.getCors().getAllowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "If-Match", "X-XSRF-TOKEN"));
        config.setExposedHeaders(List.of("ETag", "Retry-After"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
