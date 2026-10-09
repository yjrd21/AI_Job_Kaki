package com.server.eureka;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;
import lombok.extern.slf4j.Slf4j;

@SpringBootApplication
@EnableEurekaServer
@Slf4j
public class EurekaApplication {

	public static void main(String[] args) {
		log.info("Starting Eureka Server");
		SpringApplication.run(EurekaApplication.class, args);
	}

}
