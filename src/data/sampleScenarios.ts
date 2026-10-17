import { ScenarioBook } from '../types/scenario';
import passwordScenarioData from '../../scenarios/password.json';

export const defaultScenarioBook: ScenarioBook = passwordScenarioData as unknown as ScenarioBook;
