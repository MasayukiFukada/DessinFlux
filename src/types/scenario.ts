export type AspectRatio = '16:9' | '1:1' | '4:3' | '9:16';

export type NodeColor = 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate' | 'cyan';

export interface ScenarioNode {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string; // lucide icon name (e.g., 'laptop', 'server', 'database', 'key', 'shield', 'user')
  x: number; // 0 - 100 percentage
  y: number; // 0 - 100 percentage
  color?: NodeColor;
}

export type StepActionType = 'message' | 'transform' | 'state' | 'highlight' | 'result';

export interface MessageAction {
  type: 'message';
  from: string; // node id
  to: string; // node id
  label: string;
  payload?: string;
  icon?: string;
  status?: 'default' | 'danger' | 'safe' | 'warning';
}

export interface TransformAction {
  type: 'transform';
  target: string; // node id
  label: string;
  badge?: string; // e.g., "SHA-256", "Argon2"
  result?: string;
  icon?: string;
}

export interface StateAction {
  type: 'state';
  target: string; // node id
  label: string;
  value?: string;
  status?: 'default' | 'danger' | 'safe' | 'warning';
}

export interface HighlightAction {
  type: 'highlight';
  target: string[]; // node ids
  label?: string;
}

export interface ResultAction {
  type: 'result';
  target: string; // node id
  status: 'success' | 'error';
  label: string;
}

export type StepAction =
  | MessageAction
  | TransformAction
  | StateAction
  | HighlightAction
  | ResultAction;

export interface ScenarioStep {
  id?: string;
  duration?: number; // duration in ms (default: 2000)
  caption: string; // human-readable explanation displayed at the bottom
  action: StepAction;
}

export interface Scenario {
  id: string;
  title: string;
  description?: string;
  nodes: ScenarioNode[];
  steps: ScenarioStep[];
}

export interface ScenarioBook {
  title: string;
  description?: string;
  aspectRatio?: AspectRatio;
  scenarios: Scenario[];
}
