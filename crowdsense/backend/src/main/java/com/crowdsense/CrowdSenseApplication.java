// backend/src/main/java/com/crowdsense/CrowdSenseApplication.java
package com.crowdsense;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class CrowdSenseApplication {

    public static void main(String[] args) {
        SpringApplication.run(CrowdSenseApplication.class, args);
    }
}