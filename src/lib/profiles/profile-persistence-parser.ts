import type {
  ListingCommercial,
  ListingCondition,
  ListingLogistics,
  ListingMedia,
  ListingProfile,
} from "../contracts";
import { validateDescriptionDocument } from "../compiler";
import { ProfilePersistenceDataError } from "./profile-errors";
import type { ProfileRecord, ProfileVersionRecord } from "./profile-record-store";

const CONDITIONS = new Set<ListingCondition>([
  "new",
  "open-box",
  "refurbished",
  "used",
]);

function invalid(path: string): never {
  throw new ProfilePersistenceDataError(
    `Persisted listing profile data is invalid at ${path}.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function objectAt(value: unknown, path: string): Record<string, unknown> {
  return isRecord(value) ? value : invalid(path);
}

function stringAt(value: unknown, path: string): string {
  return typeof value === "string" ? value : invalid(path);
}

function integerAt(value: unknown, path: string, minimum: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum
    ? value
    : invalid(path);
}

function parseCommercial(value: unknown, path: string): ListingCommercial {
  const commercial = objectAt(value, path);
  const price = objectAt(commercial.price, `${path}.price`);
  const condition = commercial.condition;
  if (typeof condition !== "string" ||
      !CONDITIONS.has(condition as ListingCondition)) {
    invalid(`${path}.condition`);
  }

  return {
    condition: condition as ListingCondition,
    price: {
      amount: stringAt(price.amount, `${path}.price.amount`),
      currency: stringAt(price.currency, `${path}.price.currency`),
    },
    quantity: integerAt(commercial.quantity, `${path}.quantity`, 0),
  };
}

function parseLogistics(value: unknown, path: string): ListingLogistics {
  const logistics = objectAt(value, path);
  if (typeof logistics.returnsAccepted !== "boolean") {
    invalid(`${path}.returnsAccepted`);
  }

  return {
    dispatchTimeMaxDays: integerAt(
      logistics.dispatchTimeMaxDays,
      `${path}.dispatchTimeMaxDays`,
      0,
    ),
    packageWeightGrams: integerAt(
      logistics.packageWeightGrams,
      `${path}.packageWeightGrams`,
      0,
    ),
    returnsAccepted: logistics.returnsAccepted,
  };
}

function parseMedia(value: unknown, path: string): ListingMedia {
  const media = objectAt(value, path);
  if (!Array.isArray(media.images)) invalid(`${path}.images`);

  return {
    images: media.images.map((value, index) => {
      const imagePath = `${path}.images[${index}]`;
      const image = objectAt(value, imagePath);
      return {
        alt: stringAt(image.alt, `${imagePath}.alt`),
        url: stringAt(image.url, `${imagePath}.url`),
      };
    }),
  };
}

function parseListingProfile(value: unknown, path: string): ListingProfile {
  const profile = objectAt(value, path);
  const identity = objectAt(profile.identity, `${path}.identity`);
  const description = validateDescriptionDocument(profile.descriptionDocument);
  if (!description.valid || description.document === null) {
    invalid(`${path}.descriptionDocument`);
  }

  return {
    commercial: parseCommercial(profile.commercial, `${path}.commercial`),
    descriptionDocument: description.document,
    identity: {
      profileId: stringAt(identity.profileId, `${path}.identity.profileId`),
      sku: stringAt(identity.sku, `${path}.identity.sku`),
      title: stringAt(identity.title, `${path}.identity.title`),
    },
    logistics: parseLogistics(profile.logistics, `${path}.logistics`),
    media: parseMedia(profile.media, `${path}.media`),
    revision: integerAt(profile.revision, `${path}.revision`, 1),
  };
}

export function parseProfileRecord(value: unknown): ProfileRecord {
  const row = objectAt(value, "profile");
  const profile = parseListingProfile({
    commercial: row.commercial,
    descriptionDocument: row.descriptionDocument,
    identity: {
      profileId: row.profileId,
      sku: row.sku,
      title: row.title,
    },
    logistics: row.logistics,
    media: row.media,
    revision: row.revision,
  }, "profile");

  return {
    commercial: profile.commercial,
    descriptionDocument: profile.descriptionDocument,
    logistics: profile.logistics,
    media: profile.media,
    profileId: profile.identity.profileId,
    revision: profile.revision,
    sku: profile.identity.sku,
    title: profile.identity.title,
  };
}

export function parseProfileVersionRecord(value: unknown): ProfileVersionRecord {
  const row = objectAt(value, "version");
  const profileId = stringAt(row.profileId, "version.profileId");
  const revision = integerAt(row.revision, "version.revision", 1);
  const snapshot = parseListingProfile(row.snapshot, "version.snapshot");

  if (snapshot.identity.profileId !== profileId) {
    invalid("version.snapshot.identity.profileId");
  }
  if (snapshot.revision !== revision) {
    invalid("version.snapshot.revision");
  }

  return { profileId, revision, snapshot };
}
