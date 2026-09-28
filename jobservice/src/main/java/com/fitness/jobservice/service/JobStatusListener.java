package com.fitness.jobservice.service;
import com.fitness.jobservice.dto.JobStatusEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
@Component @RequiredArgsConstructor
public class JobStatusListener {
    private final JobService service;
    @RabbitListener(queues = "job-status")
    public void handle(JobStatusEvent event) { service.updateStatus(event); }
}
