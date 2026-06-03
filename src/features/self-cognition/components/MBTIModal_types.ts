export interface TestResultData {
  type: string;
  title: string;
  description: string;
  scores: {
    e: number; i: number;
    s: number; n: number;
    t: number; f: number;
    j: number; p: number;
  };
  strengths: string[];
  weaknesses: string[];
}
