package com.jobkaki.jobservice.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    // Declare the queue used to receive job-analysis requests.
    @Bean
    Queue analysisQueue() {
        return new Queue("job-analysis", true);
    }

    // Declare the queue used to receive job-analysis status updates.
    @Bean
    Queue statusQueue() {
        return new Queue("job-status", true);
    }

    // Declare the exchange used for Job Service and AI Service messages.
    @Bean
    DirectExchange jobExchange() {
        return new DirectExchange("job-exchange");
    }

    // Route job-analysis messages to the analysis queue.
    @Bean
    Binding analysisBinding(
            @Qualifier("analysisQueue") Queue queue,
            DirectExchange exchange) {
        return BindingBuilder.bind(queue)
                .to(exchange)
                .with("job.analyze");
    }

    // Route job-status messages to the status queue.
    @Bean
    Binding statusBinding(
            @Qualifier("statusQueue") Queue queue,
            DirectExchange exchange) {
        return BindingBuilder.bind(queue)
                .to(exchange)
                .with("job.status");
    }

    // Serialize RabbitMQ messages as JSON.
    @Bean
    MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}
