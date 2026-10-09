package com.jobkaki.aiservice;

import com.jobkaki.aiservice.dto.JobAnalysisRequest;
import com.jobkaki.aiservice.dto.JobAnalysisResult;
import com.jobkaki.aiservice.model.JobAnalysis;
import com.jobkaki.aiservice.model.RequirementMatch;
import com.jobkaki.aiservice.model.RequirementMatchStatus;
import com.jobkaki.aiservice.repository.JobAnalysisRepository;
import com.jobkaki.aiservice.service.AnalysisService;
import com.jobkaki.aiservice.service.OpenAIService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AnalysisServiceTest {
    @Test
    void promptIncludesJobAndCandidateContext() {
        var request = new JobAnalysisRequest(UUID.randomUUID(), UUID.randomUUID(), "TEXT",
                "Senior platform engineer", new JobAnalysisRequest.CandidateContext(
                        UUID.randomUUID(), UUID.randomUUID(), "cv.pdf", List.of("Platform Engineer"),
                        List.of("Remote"), List.of("Unpaid trial")));
        String prompt = new AnalysisService(null, null, null).buildPrompt(request);
        assertTrue(prompt.contains("Senior platform engineer"));
        assertTrue(prompt.contains("Platform Engineer"));
        assertTrue(prompt.contains("Unpaid trial"));
        assertTrue(prompt.contains("single advertised job title"));
    }

    @Test
    void analyzePersistsEachStructuredResultFieldWithoutUsingCandidateRolesAsTitle() {
        JobAnalysisRepository repository = mock(JobAnalysisRepository.class);
        OpenAIService openAI = mock(OpenAIService.class);
        RabbitTemplate rabbit = mock(RabbitTemplate.class);
        AnalysisService service = new AnalysisService(repository, openAI, rabbit);
        JobAnalysisRequest request = new JobAnalysisRequest(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "TEXT",
                "Principal Engineer at Example Co",
                new JobAnalysisRequest.CandidateContext(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        "cv.pdf",
                        List.of("Data Scientist", "Product Manager"),
                        List.of("Remote"),
                        List.of()));
        List<RequirementMatch> requirements = List.of(
                new RequirementMatch(
                        "Five years of Java experience",
                        RequirementMatchStatus.PARTIALLY_MET,
                        "The candidate profile indicates three years of Java experience."));
        JobAnalysisResult result = new JobAnalysisResult(
                "Example Co",
                "Principal Engineer",
                "2026-11-01",
                "$150,000-$180,000",
                List.of("The posting requires unpaid work before employment."),
                requirements,
                "The candidate is a partial fit for this role.",
                List.of("Can the unpaid pre-employment work be removed?"));
        when(openAI.getAnalysis(anyString())).thenReturn(result);

        service.analyze(request);

        ArgumentCaptor<JobAnalysis> analysisCaptor = ArgumentCaptor.forClass(JobAnalysis.class);
        verify(repository).save(analysisCaptor.capture());
        JobAnalysis analysis = analysisCaptor.getValue();
        assertEquals("Example Co", analysis.getCompanyContext());
        assertEquals("Principal Engineer", analysis.getRoleTitle());
        assertEquals("2026-11-01", analysis.getApplicationDeadline());
        assertEquals("$150,000-$180,000", analysis.getSalaryRange());
        assertEquals(result.redFlags(), analysis.getRedFlags());
        assertEquals(requirements, analysis.getRequirements());
        assertEquals(result.matchSummary(), analysis.getMatchSummary());
        assertEquals(result.questionsToClarify(), analysis.getQuestionsToClarify());
    }
}
