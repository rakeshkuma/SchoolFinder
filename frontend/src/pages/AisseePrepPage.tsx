import { AISSEE_PREP } from '../content/aisseePrep';
import { ExamPrepPage } from './ExamPrepPage';

/** /exams/aissee: the AISSEE Class VI preparation dashboard (content in content/aisseePrep.ts). */
export function AisseePrepPage() {
  return <ExamPrepPage config={AISSEE_PREP} />;
}
