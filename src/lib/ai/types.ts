export type AiStructuredRequest = {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  maxTokens?: number;
  temperature?: number;
};

export interface AiProvider {
  name: string;
  model: string;
  isConfigured(): boolean;
  generateStructuredResult<T>(request: AiStructuredRequest): Promise<T>;
}

export type WorkDiagnosisResult = {
  designSummary: string;
  designHighlights: string[];
  targetAudience: string[];
  suitableScenes: string[];
  suggestedCategories: string[];
  suggestedMaterials: string[];
  suggestedTechniques: string[];
  productionRisks: string[];
  missingInformation: string[];
  nextStepSuggestions: string[];
  professionalAssessment: string;
  productionAssessment: string;
  marketAssessment: string;
  confidence: number;
};

export type WorkDiagnosisInput = {
  title: string;
  description: string;
  category: string;
  workType: string;
  styleTags: string[];
  school?: string | null;
  teacherRecommendations: string[];
  opportunityProfile?: {
    targetQuantity?: number | null;
    targetRetailPrice?: string | null;
    sampleStatus?: string | null;
    fabricStatus?: string | null;
    targetLaunchDate?: string | null;
  } | null;
};
