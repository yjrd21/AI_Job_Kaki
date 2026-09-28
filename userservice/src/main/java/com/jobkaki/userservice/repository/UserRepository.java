package com.jobkaki.userservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import com.jobkaki.userservice.model.User;

@Repository 
public interface UserRepository extends MongoRepository<User, UUID> {
    boolean existsByEmail(String email);
}
