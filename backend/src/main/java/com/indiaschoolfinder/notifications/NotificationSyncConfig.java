package com.indiaschoolfinder.notifications;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(NotificationSyncProperties.class)
public class NotificationSyncConfig {
}
