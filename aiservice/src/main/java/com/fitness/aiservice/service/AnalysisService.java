package com.fitness.aiservice.service;
import com.fitness.aiservice.dto.*; import com.fitness.aiservice.model.*; import com.fitness.aiservice.repository.JobAnalysisRepository;
import java.time.LocalDateTime; import java.util.*; import lombok.RequiredArgsConstructor; import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus; import org.springframework.stereotype.Service; import org.springframework.web.server.ResponseStatusException;
@Service @RequiredArgsConstructor
public class AnalysisService {
 private final JobAnalysisRepository repository; private final OpenAIService openAI; private final RabbitTemplate rabbit;
 public void analyze(JobAnalysisRequest r) {
  rabbit.convertAndSend("job-exchange","job.status",new JobStatusEvent(r.jobSubmissionId(),null,JobStatus.PROCESSING,null));
  try { String answer=openAI.getAnswer(buildPrompt(r)); JobAnalysis a=new JobAnalysis(); a.setId(UUID.randomUUID()); a.setJobSubmissionId(r.jobSubmissionId());
   a.setRoleTitle(r.candidateContext()==null?"Unknown role":String.join(", ",Optional.ofNullable(r.candidateContext().targetRoles()).orElse(List.of())));
   a.setRedFlagAnalysis("AI-generated analysis; verify external sources before acting."); a.setRequirements(List.of(new RequirementMatch("Candidate fit",RequirementMatchStatus.UNKNOWN,answer)));
   a.setMatchSummary(answer); a.setCreatedAt(LocalDateTime.now()); repository.save(a);
   rabbit.convertAndSend("job-exchange","job.status",new JobStatusEvent(r.jobSubmissionId(),a.getId(),JobStatus.COMPLETED,null));
  } catch(Exception e) { rabbit.convertAndSend("job-exchange","job.status",new JobStatusEvent(r.jobSubmissionId(),null,JobStatus.FAILED,e.getMessage())); }
 }
 public String buildPrompt(JobAnalysisRequest r) { var c=r.candidateContext(); return "Analyze this job posting for candidate fit. Return company context, role title, deadline, salary range, red flags, requirement matches, and a concise match summary.\nSubmission type: "+r.submissionType()+"\nJob context:\n"+r.jobContext()+"\nCandidate target roles: "+(c==null?List.of():c.targetRoles())+"\nPreferences: "+(c==null?List.of():c.preferences())+"\nRed flags: "+(c==null?List.of():c.redFlags()); }
 public JobAnalysisResponse get(UUID id) { JobAnalysis a=repository.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Analysis not found"));
  return new JobAnalysisResponse(a.getId(),a.getJobSubmissionId(),a.getCompanyContext(),a.getRoleTitle(),a.getApplicationDeadline(),a.getSalaryRange(),a.getRedFlagAnalysis(),a.getRequirements(),a.getMatchSummary(),a.getCreatedAt()); }
}
