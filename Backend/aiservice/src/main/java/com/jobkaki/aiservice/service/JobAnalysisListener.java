package com.jobkaki.aiservice.service;

import com.jobkaki.aiservice.dto.JobAnalysisRequest;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class JobAnalysisListener {
    private final AnalysisService service;

    public JobAnalysisListener(AnalysisService service) {
        this.service = service;
    }

    // Receive job-analysis requests from Job Service and start analysis.
    @RabbitListener(queues = "${rabbitmq.queue.analysis-name}")
    public void handle(JobAnalysisRequest request) {
        log.info(
                "Consumed job analysis message: jobSubmissionId={}, userId={}",
                request.jobSubmissionId(),
                request.userId());
        service.analyze(request);
    }
}
