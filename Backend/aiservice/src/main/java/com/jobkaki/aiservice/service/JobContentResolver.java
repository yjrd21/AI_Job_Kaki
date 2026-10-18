package com.jobkaki.aiservice.service;

import java.net.URI;
import java.time.Duration;
import java.util.Locale;
import java.util.regex.Pattern;
import io.netty.channel.ChannelOption;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import reactor.netty.http.client.HttpClient;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Resolves URL or TEXT submissions into job description text for AI evaluation.
 *
 * <ul>
 *   <li>Normalizes pasted text and checks its minimum content and maximum length.</li>
 *   <li>Validates LinkedIn job URLs and canonicalizes them to a fixed public HTTPS host.</li>
 *   <li>Retrieves public HTML with timeouts and a response size limit, without credentials or redirects.</li>
 *   <li>Extracts the job description and available role title, excluding unrelated page content.</li>
 *   <li>Rejects inaccessible pages, detected login/challenge pages, and insufficient descriptions
 *       with an {@link AnalysisException} containing a safe message and a manual-paste fallback.</li>
 * </ul>
 *
 * <p>Does not bypass LinkedIn access restrictions. AI evaluation, CV processing, persistence,
 * and submission status updates are handled by other components.</p>
 */
@Service
public class JobContentResolver {
    private static final Pattern JOB_PATH = Pattern.compile("/jobs/view/(?:[a-zA-Z0-9-]+-)?([0-9]+)/?");
    private static final String PASTE = " Please paste the full job description manually instead.";
    private final WebClient client;

    public JobContentResolver(WebClient.Builder builder) {
        // No redirects, cookies, login, or browser impersonation. Only a fixed public LinkedIn host.
        client = builder.clone()
                .defaultHeaders(headers -> headers.clear())
                .defaultCookies(cookies -> cookies.clear())
                .clientConnector(new ReactorClientHttpConnector(HttpClient.create()
                        .followRedirect(false)
                        .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
                        .responseTimeout(Duration.ofSeconds(10))))
                .codecs(config -> config.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build();
    }

    public String resolve(String submissionType, String context) {
        if ("TEXT".equals(submissionType)) {
            return validateContent(context);
        }
        if (!"URL".equals(submissionType)) {
            throw new AnalysisException("INVALID_SUBMISSION_TYPE", "Choose a LinkedIn URL or a pasted job description.");
        }
        URI uri = linkedinJobUri(context);
        String html;
        try {
            html = client.get().uri(uri)
                    .header("User-Agent", "JobKaki/1.0")
                    .accept(MediaType.TEXT_HTML)
                    .exchangeToMono(response -> {
                        if (response.statusCode().value() != 200
                                || !response.headers().contentType()
                                        .map(type -> MediaType.TEXT_HTML.isCompatibleWith(type)).orElse(false)) {
                            return response.releaseBody().then(Mono.<String>error(inaccessible()));
                        }
                        return response.bodyToMono(String.class);
                    })
                    .block(Duration.ofSeconds(10));
        } catch (Exception exception) {
            throw inaccessible();
        }
        var document = Jsoup.parse(html == null ? "" : html);
        String title = document.title().toLowerCase(Locale.ROOT);
        if (title.contains("sign in") || title.contains("login") || title.contains("security verification")
                || title.contains("authwall") || document.selectFirst("#captcha-internal, .challenge-page") != null) {
            throw inaccessible();
        }
        // Restrict extraction to the posting: never use the whole page or recommended jobs.
        Element description = document.selectFirst(".show-more-less-html__markup, .description__text");
        if (description == null) {
            throw inaccessible();
        }
        description.select("script, style, form, nav").remove();
        String content = validateContent(description.text());
        Element role = document.selectFirst("h1.top-card-layout__title, h1.topcard__title, h1");
        return (role == null ? "" : role.text() + "\n") + content;
    }

    private URI linkedinJobUri(String input) {
        try {
            URI uri = URI.create(input == null ? "" : input.trim());
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            var path = JOB_PATH.matcher(uri.getPath() == null ? "" : uri.getPath());
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getUserInfo() != null
                    || (uri.getPort() != -1 && uri.getPort() != 443)
                    || !(host.equals("linkedin.com") || host.equals("www.linkedin.com")
                            || host.matches("[a-z]{2}\\.linkedin\\.com")) || !path.matches()) {
                throw new IllegalArgumentException();
            }
            // Drop tracking parameters and regional hosts; user input cannot choose the fetch destination.
            return URI.create("https://www.linkedin.com/jobs/view/" + path.group(1) + "/");
        } catch (IllegalArgumentException exception) {
            throw new AnalysisException("INVALID_JOB_URL", "Enter a valid HTTPS LinkedIn job URL." + PASTE);
        }
    }

    private String validateContent(String text) {
        String content = text == null ? "" : text.replaceAll("\\s+", " ").trim();
        if (content.length() < 180 || content.split("\\s+").length < 30) {
            throw new AnalysisException("JOB_CONTENT_INSUFFICIENT", "There is not enough job description content to evaluate this role." + PASTE);
        }
        if (content.length() > 60000) {
            throw new AnalysisException("JOB_CONTENT_TOO_LONG", "The job description is too long. Paste only the role description and requirements.");
        }
        return content;
    }

    private AnalysisException inaccessible() {
        return new AnalysisException("JOB_SOURCE_INACCESSIBLE", "We couldn't retrieve this LinkedIn job posting. It may require sign-in or be unavailable." + PASTE);
    }
}
