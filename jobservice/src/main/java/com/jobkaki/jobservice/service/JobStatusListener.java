package com.jobkaki.jobservice.service;

import com.jobkaki.jobservice.dto.JobStatusEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JobStatusListener {
    private final JobService service;

    // Receive asynchronous analysis status updates and pass them to the job service.
    @RabbitListener(queues = "job-status")
    public void handle(JobStatusEvent event) {
        service.updateStatus(event);
    }
}
