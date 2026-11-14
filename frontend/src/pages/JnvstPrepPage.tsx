import { JNVST_PREP } from '../content/jnvstPrep';
import { ExamPrepPage } from './ExamPrepPage';

/** /exams/jnvst: the JNVST Class VI preparation dashboard (content in content/jnvstPrep.ts). */
export function JnvstPrepPage() {
  return <ExamPrepPage config={JNVST_PREP} />;
}
