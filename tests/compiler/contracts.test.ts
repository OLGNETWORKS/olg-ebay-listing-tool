import { describe, expect, it } from "vitest";

import type {
  PublishApproval,
  PublishResult,
} from "../../src/lib/contracts";

const approval = {
  approvedAt: "2026-08-17T20:00:00.000Z",
  approvedBy: "internal-user-1",
  confirmationId: "confirmation-once-1",
  environment: "mock",
  expiresAt: "2026-08-17T20:05:00.000Z",
  operation: "publish-draft",
  profileId: "profile-1",
  profileRevision: 3,
} satisfies PublishApproval;

const published = {
  externalListingId: "mock-listing-1",
  message: "Published by mock gateway.",
  status: "published",
} satisfies PublishResult;

const rejected = {
  message: "Approval expired.",
  status: "rejected",
} satisfies PublishResult;

// @ts-expect-error A published result must identify the external listing.
const invalidPublished: PublishResult = {
  message: "Missing id.",
  status: "published",
};

// @ts-expect-error A rejected result cannot claim an external listing id.
const invalidRejected: PublishResult = {
  externalListingId: "must-not-exist",
  message: "Rejected.",
  status: "rejected",
};

describe("publishing contracts", () => {
  it("binds approval to one draft revision and models valid result states", () => {
    expect(approval).toMatchObject({
      operation: "publish-draft",
      profileId: "profile-1",
      profileRevision: 3,
    });
    expect([published.status, rejected.status]).toEqual([
      "published",
      "rejected",
    ]);
    expect([invalidPublished.status, invalidRejected.status]).toHaveLength(2);
  });
});
