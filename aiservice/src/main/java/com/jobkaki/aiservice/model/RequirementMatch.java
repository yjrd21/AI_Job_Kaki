package com.jobkaki.aiservice.model;
import lombok.*;
@Data @NoArgsConstructor @AllArgsConstructor
public class RequirementMatch { private String requirement; private RequirementMatchStatus status; private String explanation; }
