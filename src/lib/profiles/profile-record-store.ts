import type {
  DescriptionDocument,
  ListingCommercial,
  ListingLogistics,
  ListingMedia,
  ListingProfile,
} from "../contracts";

export interface ProfileRecord {
  readonly commercial: ListingCommercial;
  readonly descriptionDocument: DescriptionDocument;
  readonly logistics: ListingLogistics;
  readonly media: ListingMedia;
  readonly profileId: string;
  readonly revision: number;
  readonly sku: string;
  readonly title: string;
}

export interface ProfileVersionRecord {
  readonly profileId: string;
  readonly revision: number;
  readonly snapshot: ListingProfile;
}

export interface ProfileRecordStore {
  findById(profileId: string): Promise<ProfileRecord | null>;
  findBySku(sku: string): Promise<ProfileRecord | null>;
  insert(
    record: ProfileRecord,
    version: ProfileVersionRecord,
  ): Promise<boolean>;
  listVersions(profileId: string): Promise<readonly ProfileVersionRecord[]>;
  replace(
    record: ProfileRecord,
    expectedRevision: number,
    version: ProfileVersionRecord,
  ): Promise<boolean>;
}
