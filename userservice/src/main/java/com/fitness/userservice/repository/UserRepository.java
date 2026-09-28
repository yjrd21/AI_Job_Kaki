package com.fitness.userservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import com.fitness.userservice.model.User;

@Repository 
public interface UserRepository extends MongoRepository<User, UUID> {
    boolean existsByEmail(String email);
}
