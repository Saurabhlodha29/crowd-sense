// backend/src/main/java/com/crowdsense/config/WebSocketConfig.java
package com.crowdsense.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * SimpleBroker handles up to ~500 concurrent connections without Redis.
     * Topics:
     * /topic/crowd – live crowd updates (all clients)
     * /topic/alerts – threshold breach alerts
     * /topic/sensor-status – sensor online/offline status
     * /topic/events/{id} – per-event crowd updates
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    /**
     * /ws – SockJS fallback endpoint (kept for compatibility)
     * /ws-native – Pure WebSocket endpoint used by the frontend (no SockJS)
     *
     * The frontend connects to: ws://localhost:8080/ws/websocket
     * (Spring's SockJS server exposes this path automatically.)
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // SockJS endpoint (fallback for environments that block WS)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        // Pure WebSocket endpoint — what the frontend actually uses
        registry.addEndpoint("/ws-native")
                .setAllowedOriginPatterns("*");
    }
}