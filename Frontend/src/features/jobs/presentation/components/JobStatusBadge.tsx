import type {JobStatus,RequirementMatchStatus} from '../../domain/models/Job';
export function StatusBadge({status}:{status:JobStatus|RequirementMatchStatus}){return <span className={`status ${status}`}>{status.replaceAll('_',' ')}</span>}
