package com.jobkaki.aiservice.service;

import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import static org.junit.jupiter.api.Assertions.*;

class JobContentResolverTest {
    static final String DESCRIPTION = "As a platform engineer you will design and maintain Java services, collaborate with product teams, "
            + "review technical designs, and improve production reliability. Requirements include five years of Java experience, "
            + "knowledge of Spring Boot and PostgreSQL, strong communication skills, and experience operating distributed systems.";

    private JobContentResolver resolver(HttpStatus status, String body) {
        return new JobContentResolver(WebClient.builder().exchangeFunction(request -> {
            assertEquals("https://www.linkedin.com/jobs/view/4459735599/", request.url().toString());
            return Mono.just(ClientResponse.create(status).header("Content-Type", "text/html").body(body).build());
        }));
    }

    @Test
    void retrievesOnlyPostingContentAndCanonicalizesUrl() {
        String html = "<title>Engineer | LinkedIn</title><h1 class='top-card-layout__title'>Platform Engineer</h1>"
                + "<div class='show-more-less-html__markup'>" + DESCRIPTION + "</div><aside>Unrelated recommended job</aside>";
        String result = resolver(HttpStatus.OK, html).resolve("URL",
                "https://sg.linkedin.com/jobs/view/platform-engineer-4459735599/?trackingId=discard");
        assertTrue(result.startsWith("Platform Engineer\n"));
        assertTrue(result.contains("five years of Java"));
        assertFalse(result.contains("recommended job"));
    }

    @Test
    void publicSignInBannerDoesNotHideAnAccessibleDescription() {
        assertDoesNotThrow(() -> resolver(HttpStatus.OK,
                "<p>Sign in to save this job</p><div class='description__text'>" + DESCRIPTION + "</div>")
                .resolve("URL", "https://www.linkedin.com/jobs/view/4459735599/"));
    }

    @Test
    void rejectsAccessDeniedRedirectAndLoginPages() {
        for (HttpStatus status : new HttpStatus[] {HttpStatus.FORBIDDEN, HttpStatus.TOO_MANY_REQUESTS,
                HttpStatus.NOT_FOUND, HttpStatus.FOUND}) {
            AnalysisException error = assertThrows(AnalysisException.class,
                    () -> resolver(status, "").resolve("URL", "https://www.linkedin.com/jobs/view/4459735599/"));
            assertEquals("JOB_SOURCE_INACCESSIBLE", error.code());
            assertTrue(error.getMessage().contains("paste the full job description"));
        }
        for (String page : new String[] {"<title>Sign in | LinkedIn</title><form>Login</form>",
                "<title>Security Verification</title>", "<form action='/login'>Login</form>"}) {
            assertEquals("JOB_SOURCE_INACCESSIBLE", assertThrows(AnalysisException.class,
                    () -> resolver(HttpStatus.OK, page).resolve("URL",
                            "https://www.linkedin.com/jobs/view/4459735599/")).code());
        }
    }

    @Test
    void rejectsInsufficientDescriptionEvenWhenPageContainsOtherLongText() {
        String html = "<div class='show-more-less-html__markup'>Hiring an engineer.</div><aside>"
                + DESCRIPTION + "</aside>";
        assertEquals("JOB_CONTENT_INSUFFICIENT", assertThrows(AnalysisException.class,
                () -> resolver(HttpStatus.OK, html).resolve("URL",
                        "https://www.linkedin.com/jobs/view/4459735599/")).code());
    }

    @Test
    void invalidDestinationsNeverMakeANetworkRequest() {
        AtomicInteger calls = new AtomicInteger();
        JobContentResolver resolver = new JobContentResolver(WebClient.builder().exchangeFunction(request -> {
            calls.incrementAndGet();
            return Mono.error(new AssertionError("Must not fetch this destination"));
        }));
        for (String url : new String[] {"http://www.linkedin.com/jobs/view/4459735599/",
                "https://linkedin.com.attacker.test/jobs/view/4459735599/", "http://127.0.0.1/",
                "https://www.linkedin.com:444/jobs/view/4459735599/", "https://www.linkedin.com/login",
                "https://attacker@www.linkedin.com/jobs/view/4459735599/"}) {
            assertEquals("INVALID_JOB_URL", assertThrows(AnalysisException.class,
                    () -> resolver.resolve("URL", url)).code());
        }
        assertEquals(0, calls.get());
    }

    @Test
    void transportFailureFailsGracefully() {
        var resolver = new JobContentResolver(WebClient.builder().exchangeFunction(request ->
                Mono.error(new IllegalStateException("Connection timed out"))));
        assertEquals("JOB_SOURCE_INACCESSIBLE", assertThrows(AnalysisException.class,
                () -> resolver.resolve("URL", "https://www.linkedin.com/jobs/view/4459735599/")).code());
    }

    @Test
    void validatesPastedTextWithoutFetchingAndDoesNotTruncateLongInput() {
        var resolver = new JobContentResolver(WebClient.builder().exchangeFunction(request -> {
            throw new AssertionError("TEXT must not fetch a URL");
        }));
        assertEquals(DESCRIPTION, resolver.resolve("TEXT", DESCRIPTION));
        assertEquals("JOB_CONTENT_INSUFFICIENT", assertThrows(AnalysisException.class,
                () -> resolver.resolve("TEXT", "Engineer wanted")).code());
        assertEquals("JOB_CONTENT_TOO_LONG", assertThrows(AnalysisException.class,
                () -> resolver.resolve("TEXT", DESCRIPTION.repeat(200))).code());
    }

    @Test
    void retrievalNeverInheritsProviderCredentialsFromASharedBuilder() {
        var builder = WebClient.builder().defaultHeader("Authorization", "Bearer private-key")
                .defaultCookie("session", "private-session")
                .exchangeFunction(request -> {
                    assertNull(request.headers().getFirst("Authorization"));
                    assertTrue(request.cookies().isEmpty());
                    return Mono.just(ClientResponse.create(HttpStatus.OK).header("Content-Type", "text/html")
                            .body("<div class='description__text'>" + DESCRIPTION + "</div>").build());
                });
        assertDoesNotThrow(() -> new JobContentResolver(builder).resolve("URL",
                "https://www.linkedin.com/jobs/view/4459735599/"));
    }
}
