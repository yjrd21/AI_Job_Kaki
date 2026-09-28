package com.jobkaki.jobservice.service;

import com.jobkaki.jobservice.dto.JobStatusEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class JobStatusListener {
    private final JobService service;

    // Receive asynchronous analysis status updates and pass them to the job service.
    @RabbitListener(queues = "${rabbitmq.queue.status-name}")
    public void handle(JobStatusEvent event) {
        log.info(
                "Consumed job status message: jobSubmissionId={}, jobAnalysisId={}, status={}",
                event.jobSubmissionId(),
                event.jobAnalysisId(),
                event.status());
        service.updateStatus(event);
    }
}
