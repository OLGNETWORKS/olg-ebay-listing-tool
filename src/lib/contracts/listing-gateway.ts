import type { ListingProfile } from "./listing-profile";

export interface ListingValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly path: string;
}

export interface ListingValidationResult {
  readonly errors: readonly ListingValidationIssue[];
  readonly valid: boolean;
  readonly warnings: readonly ListingValidationIssue[];
}

export interface PublishApproval {
  readonly approvedAt: string;
  readonly approvedBy: string;
  /** Single-use identifier that the application layer must consume atomically. */
  readonly confirmationId: string;
  readonly environment: "mock" | "sandbox";
  readonly expiresAt: string;
  readonly operation: "publish-draft";
  readonly profileId: string;
  readonly profileRevision: number;
}

interface PublishResultBase {
  readonly message: string;
}

export interface PublishedResult extends PublishResultBase {
  readonly externalListingId: string;
  readonly status: "published";
}

export interface RejectedPublishResult extends PublishResultBase {
  readonly externalListingId?: never;
  readonly status: "rejected";
}

export interface SimulatedPublishResult extends PublishResultBase {
  readonly externalListingId?: never;
  readonly status: "simulated";
}

export type PublishResult =
  | PublishedResult
  | RejectedPublishResult
  | SimulatedPublishResult;

export interface ListingGateway {
  validateDraft(profile: ListingProfile): Promise<ListingValidationResult>;
  publishDraft(
    profile: ListingProfile,
    approval: PublishApproval,
  ): Promise<PublishResult>;
}
