package com.jobkaki.aiservice.service;
import com.jobkaki.aiservice.dto.JobAnalysisRequest; import lombok.RequiredArgsConstructor; import org.springframework.amqp.rabbit.annotation.RabbitListener; import org.springframework.stereotype.Component;
@Component @RequiredArgsConstructor public class JobAnalysisListener { private final AnalysisService service;
 @RabbitListener(queues="job-analysis") public void handle(JobAnalysisRequest request) { service.analyze(request); } }
