package com.jobkaki.userservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import lombok.extern.slf4j.Slf4j;

@SpringBootApplication
@Slf4j
public class UserserviceApplication {

	public static void main(String[] args) {
		log.info("Starting User Service");
		SpringApplication.run(UserserviceApplication.class, args);
	}

}
