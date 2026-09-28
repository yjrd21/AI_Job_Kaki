package com.jobkaki.aiservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import lombok.extern.slf4j.Slf4j;

@SpringBootApplication
@Slf4j
public class AiserviceApplication {

	public static void main(String[] args) {
		log.info("Starting AI Service");
		SpringApplication.run(AiserviceApplication.class, args);
	}

}
