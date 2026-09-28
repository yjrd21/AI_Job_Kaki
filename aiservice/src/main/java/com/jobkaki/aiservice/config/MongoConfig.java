package com.jobkaki.aiservice.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import lombok.extern.slf4j.Slf4j;

@Configuration 
@EnableMongoAuditing 
@Slf4j
public class MongoConfig {

    public MongoConfig() {
        log.info("Mongo auditing configuration initialized");
    }
}
