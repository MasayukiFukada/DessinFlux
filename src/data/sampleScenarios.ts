import { ScenarioBook } from '../types/scenario';
import passwordScenarioData from '../../scenarios/password.json';
import basicsScenarioData from '../../scenarios/basics.json';

export const passwordScenarioBook: ScenarioBook = passwordScenarioData as unknown as ScenarioBook;
export const basicsScenarioBook: ScenarioBook = basicsScenarioData as unknown as ScenarioBook;

export const defaultScenarioBook: ScenarioBook = passwordScenarioBook;

export interface BuiltInBookItem {
  id: string;
  name: string;
  book: ScenarioBook;
}

export const builtInBooks: BuiltInBookItem[] = [
  { id: 'password', name: 'パスワード認証の仕組み (全14シナリオ)', book: passwordScenarioBook },
  { id: 'basics', name: '基本表現ショーケース (basics.json)', book: basicsScenarioBook },
];
