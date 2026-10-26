package com.indiaschoolfinder.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    public static final String BEARER_AUTH = "bearerAuth";

    @Bean
    public OpenAPI indiaSchoolFinderOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("India School Finder API")
                        .version("v1")
                        .description("""
                                Search, compare and evaluate schools in Delhi. Every factual record carries a \
                                source URL, verification status and last verified date. Unknown values are \
                                returned as null, never as zero. Rankings are this site's own methodology and \
                                are not an official government ranking.""")
                        .license(new License().name("Data: see source URLs on each record")))
                .components(new Components().addSecuritySchemes(BEARER_AUTH, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Admin access token from POST /api/v1/auth/login")));
    }
}
