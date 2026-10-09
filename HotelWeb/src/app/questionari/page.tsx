import { datiQuestionari } from "./actions";
import { Questionari } from "./Questionari";

export default async function QuestionariPage() {
  return <Questionari iniziale={await datiQuestionari()} />;
}
