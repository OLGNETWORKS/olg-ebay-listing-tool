import type { ListingProfile } from "../contracts";
import {
  ProfileIdentityConflictError,
  ProfileRevisionConflictError,
  ProfileWriteConflictError,
} from "./profile-errors";
import type {
  ProfileRecord,
  ProfileRecordStore,
  ProfileVersionRecord,
} from "./profile-record-store";

export interface ProfileVersion {
  readonly profile: ListingProfile;
  readonly profileId: string;
  readonly revision: number;
}

function toRecord(profile: ListingProfile): ProfileRecord {
  return {
    commercial: structuredClone(profile.commercial),
    descriptionDocument: structuredClone(profile.descriptionDocument),
    logistics: structuredClone(profile.logistics),
    media: structuredClone(profile.media),
    profileId: profile.identity.profileId,
    revision: profile.revision,
    sku: profile.identity.sku,
    title: profile.identity.title,
  };
}

function toProfile(record: ProfileRecord): ListingProfile {
  return {
    commercial: structuredClone(record.commercial),
    descriptionDocument: structuredClone(record.descriptionDocument),
    identity: {
      profileId: record.profileId,
      sku: record.sku,
      title: record.title,
    },
    logistics: structuredClone(record.logistics),
    media: structuredClone(record.media),
    revision: record.revision,
  };
}

function toVersion(profile: ListingProfile): ProfileVersionRecord {
  return {
    profileId: profile.identity.profileId,
    revision: profile.revision,
    snapshot: structuredClone(profile),
  };
}

export class PersistentListingProfileRepository {
  constructor(private readonly store: ProfileRecordStore) {}

  async save(profile: ListingProfile): Promise<void> {
    const current = await this.store.findById(profile.identity.profileId);
    if (!current) {
      if (profile.revision !== 1) {
        throw new ProfileRevisionConflictError(
          "A new profile must start at revision 1.",
        );
      }
      const inserted = await this.store.insert(
        toRecord(profile),
        toVersion(profile),
      );
      if (!inserted) {
        throw new ProfileWriteConflictError(
          "The profile ID or SKU is already in use.",
        );
      }
      return;
    }

    if (profile.identity.sku !== current.sku) {
      throw new ProfileIdentityConflictError(
        "A persisted profile cannot change its SKU.",
      );
    }
    if (profile.revision !== current.revision + 1) {
      throw new ProfileRevisionConflictError(
        `Expected revision ${current.revision + 1}.`,
      );
    }

    const replaced = await this.store.replace(
      toRecord(profile),
      current.revision,
      toVersion(profile),
    );
    if (!replaced) {
      throw new ProfileWriteConflictError(
        "The profile changed during this write.",
      );
    }
  }

  async findById(profileId: string): Promise<ListingProfile | null> {
    const record = await this.store.findById(profileId);
    return record ? toProfile(record) : null;
  }

  async findBySku(sku: string): Promise<ListingProfile | null> {
    const record = await this.store.findBySku(sku);
    return record ? toProfile(record) : null;
  }

  async listVersions(profileId: string): Promise<readonly ProfileVersion[]> {
    const versions = await this.store.listVersions(profileId);
    return versions.map((version) => ({
      profile: structuredClone(version.snapshot),
      profileId: version.profileId,
      revision: version.revision,
    }));
  }
}
