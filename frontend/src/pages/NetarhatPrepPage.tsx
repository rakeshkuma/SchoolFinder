import { NETARHAT_PREP } from '../content/netarhatPrep';
import { ExamPrepPage } from './ExamPrepPage';

/** /exams/netarhat: the Netarhat Vidyalaya Class VI entrance preparation dashboard (content in content/netarhatPrep.ts). */
export function NetarhatPrepPage() {
  return <ExamPrepPage config={NETARHAT_PREP} />;
}
