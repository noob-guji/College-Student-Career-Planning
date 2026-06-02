const API_BASE = process.env.NEXT_PUBLIC_PYTHON_API || "http://localhost:8000";

export interface DimensionScore {
  score: number;
  tags: string[];
}

export interface JobPortrait {
  job_title: string;
  dimensions: {
    professional_skills: DimensionScore;
    certificate: DimensionScore;
    innovation: DimensionScore;
    learning: DimensionScore;
    stress_tolerance: DimensionScore;
    communication: DimensionScore;
    internship: DimensionScore;
    leadership: DimensionScore;
    problem_solving: DimensionScore;
    business_acumen: DimensionScore;
    execution: DimensionScore;
    values_fit: DimensionScore;
  };
}

export async function fetchPortraits(title?: string): Promise<JobPortrait[]> {
  const url = title
    ? `${API_BASE}/api/portraits?title=${encodeURIComponent(title)}`
    : `${API_BASE}/api/portraits`;
  const res = await fetch(url);
  return res.json();
}