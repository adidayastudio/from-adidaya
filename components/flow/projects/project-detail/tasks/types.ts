export type PurposeItem = {
  id: string;
  en: string;
  idText: string;
};

export type UnderstandingCard = {
  id: string;
  titleEn: string;
  titleId: string;
  descEn: string;
  descId: string;
};

export type GoalItem = {
  id: string;
  en: string;
  idText: string;
};

export type ScopeCategory = {
  id: string;
  name: string;
  badgeBg?: string;
  items: {
    id: string;
    titleEn: string;
    titleId: string;
    checked: boolean;
  }[];
};

export type WorkflowStep = {
  id: string;
  stageCode: string;
  stageName: string;
  duration: string;
  items: {
    id: string;
    titleEn: string;
    titleId: string;
  }[];
};

export type RoleItem = {
  id: string;
  titleEn: string;
  titleId: string;
};

export type NextStepItem = {
  id: string;
  titleEn: string;
  titleId: string;
  checked: boolean;
};

export type KickoffDocumentData = {
  // Page 1: Cover
  projectCode: string;
  projectName: string;
  projectLocation: string;
  version: string;
  stageName: string;

  // Page 2: Purpose of Kickoff
  purposeList: PurposeItem[];

  // Page 3: Project Understanding
  understandingIntroEn: string;
  understandingIntroId: string;
  understandingCards: UnderstandingCard[];

  // Page 4: Project Goals
  goalsList: GoalItem[];

  // Page 5: Scope of Work
  scopeCategories: ScopeCategory[];

  // Page 6: Workflow Overview
  workflowSteps: WorkflowStep[];

  // Page 7: Required Data & Inputs
  requiredInputs: {
    id: string;
    titleEn: string;
    titleId: string;
    checked: boolean;
  }[];

  // Page 8: Roles & Communication
  studioRoles: RoleItem[];
  clientRoles: RoleItem[];
  communicationTools: string;
  meetingFrequency: string;

  // Page 9: Next Steps
  nextSteps: NextStepItem[];

  // Page 10 & 11: Approval & Signatures
  approvalTextEn: string;
  approvalTextId: string;
  studioSigneeName: string;
  studioSigneeRole: string;
  clientSigneeName: string;
  clientSigneeRole: string;
  signDate: string;

  // Page 12: Notes
  notes: string;
};
