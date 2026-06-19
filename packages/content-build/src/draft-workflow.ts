import { hashValue, type BehaviorDefinition } from "../../engine-core/src/index.ts";
import { generateCanonicalText, generateUxHints, validateBehaviorText, type TextSyncIssue } from "./text-sync.ts";

export interface BehaviorDraftInput {
  id: string;
  prose: string;
  proposedBehavior: BehaviorDefinition;
  proposedText?: string;
  source?: "llm" | "human" | "import";
}

export interface BehaviorDraftReview {
  reviewerId: string;
  approved: boolean;
  notes?: string;
  reviewedAtSequence: number;
}

export interface BehaviorDraft {
  id: string;
  source: "llm" | "human" | "import";
  status: "draft" | "approved" | "changes_requested";
  proseHash: string;
  behaviorHash: string;
  proposedBehavior: BehaviorDefinition;
  canonicalText: string;
  reviewedText?: string;
  uxHints: Record<string, unknown>;
  validationIssues: TextSyncIssue[];
  reviewRequired: true;
  review?: BehaviorDraftReview;
}

export interface ReviewedBehaviorArtifact {
  behavior: BehaviorDefinition;
  reviewedText: string;
  uxHints: Record<string, unknown>;
  review: BehaviorDraftReview;
  source: BehaviorDraft["source"];
  contentHash: string;
}

export function createBehaviorDraft(input: BehaviorDraftInput): BehaviorDraft {
  const canonicalText = input.proposedText ?? generateCanonicalText(input.proposedBehavior);
  const proposedBehavior = {
    ...input.proposedBehavior,
    text: {
      ...(input.proposedBehavior.text ?? {}),
      template: canonicalText
    }
  };

  return {
    id: input.id,
    source: input.source ?? "llm",
    status: "draft",
    proseHash: hashValue(input.prose),
    behaviorHash: hashValue(proposedBehavior),
    proposedBehavior,
    canonicalText,
    uxHints: generateUxHints(proposedBehavior),
    validationIssues: validateBehaviorText(proposedBehavior),
    reviewRequired: true
  };
}

export function reviewBehaviorDraft(
  draft: BehaviorDraft,
  review: Omit<BehaviorDraftReview, "reviewedAtSequence"> & { reviewedAtSequence?: number },
  options: { reviewedText?: string } = {}
): BehaviorDraft {
  return {
    ...draft,
    status: review.approved ? "approved" : "changes_requested",
    reviewedText: options.reviewedText ?? draft.reviewedText ?? draft.canonicalText,
    review: {
      reviewerId: review.reviewerId,
      approved: review.approved,
      notes: review.notes,
      reviewedAtSequence: review.reviewedAtSequence ?? 1
    }
  };
}

export function buildReviewedBehaviorArtifact(draft: BehaviorDraft): ReviewedBehaviorArtifact {
  if (draft.status !== "approved" || !draft.review?.approved) {
    throw new Error(`Behavior draft ${draft.id} cannot publish without approval`);
  }

  const blockingIssues = draft.validationIssues.filter((issue) => issue.severity === "error" || issue.severity === "warning");
  if (blockingIssues.length > 0) {
    throw new Error(`Behavior draft ${draft.id} cannot publish with validation issues`);
  }

  const reviewedText = draft.reviewedText ?? draft.canonicalText;
  const behavior = {
    ...draft.proposedBehavior,
    text: {
      ...(draft.proposedBehavior.text ?? {}),
      template: reviewedText
    },
    ux: {
      ...draft.uxHints,
      ...(draft.proposedBehavior.ux ?? {})
    }
  };
  const artifact = {
    behavior,
    reviewedText,
    uxHints: draft.uxHints,
    review: draft.review,
    source: draft.source
  };

  return {
    ...artifact,
    contentHash: hashValue(artifact)
  };
}
