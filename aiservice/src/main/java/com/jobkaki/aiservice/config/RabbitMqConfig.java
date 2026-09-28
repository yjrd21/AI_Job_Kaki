package com.jobkaki.aiservice.config;
import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Qualifier;
@Configuration
public class RabbitMqConfig {
 @Bean Queue analysisQueue() { return new Queue("job-analysis", true); }
 @Bean Queue statusQueue() { return new Queue("job-status", true); }
 @Bean DirectExchange jobExchange() { return new DirectExchange("job-exchange"); }
 @Bean Binding analysisBinding(@Qualifier("analysisQueue") Queue q, DirectExchange e) { return BindingBuilder.bind(q).to(e).with("job.analyze"); }
 @Bean Binding statusBinding(@Qualifier("statusQueue") Queue q, DirectExchange e) { return BindingBuilder.bind(q).to(e).with("job.status"); }
 @Bean MessageConverter jsonMessageConverter() { return new JacksonJsonMessageConverter(); }
}
