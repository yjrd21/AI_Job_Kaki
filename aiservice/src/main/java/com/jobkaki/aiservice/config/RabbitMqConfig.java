package com.jobkaki.aiservice.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {
    @Value("${rabbitmq.exchange.name}")
    private String exchangeName;

    @Value("${rabbitmq.queue.analysis-name}")
    private String analysisQueueName;

    @Value("${rabbitmq.queue.status-name}")
    private String statusQueueName;

    @Value("${rabbitmq.routing.analysis-key}")
    private String analysisRoutingKey;

    @Value("${rabbitmq.routing.status-key}")
    private String statusRoutingKey;

    // Declare the queue used to receive job-analysis requests.
    @Bean
    Queue analysisQueue() {
        return new Queue(analysisQueueName, true);
    }

    // Declare the queue used to publish analysis status updates.
    @Bean
    Queue statusQueue() {
        return new Queue(statusQueueName, true);
    }

    // Declare the exchange shared by Job Service and AI Service.
    @Bean
    DirectExchange jobExchange() {
        return new DirectExchange(exchangeName);
    }

    // Route job-analysis requests to the analysis queue.
    @Bean
    Binding analysisBinding(
            @Qualifier("analysisQueue") Queue queue,
            DirectExchange exchange) {
        return BindingBuilder.bind(queue)
                .to(exchange)
                .with(analysisRoutingKey);
    }

    // Route status updates to the status queue.
    @Bean
    Binding statusBinding(
            @Qualifier("statusQueue") Queue queue,
            DirectExchange exchange) {
        return BindingBuilder.bind(queue)
                .to(exchange)
                .with(statusRoutingKey);
    }

    // Serialize RabbitMQ messages as JSON.
    @Bean
    MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}
