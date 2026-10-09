package com.jobkaki.aiservice.config;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.bson.UuidRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import lombok.extern.slf4j.Slf4j;

@Configuration
@EnableMongoAuditing
@Slf4j
public class MongoConfig {

    // Log when Mongo auditing support is initialized.
    public MongoConfig() {
        log.info("Mongo auditing configuration initialized");
    }

    @Bean
    MongoClient mongoClient(@Value("${spring.data.mongodb.uri}") String uri) {
        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(uri))
                .uuidRepresentation(UuidRepresentation.STANDARD)
                .build();

        return MongoClients.create(settings);
    }
}
