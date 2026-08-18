import type { PrismaClient } from "@prisma/client";

import type {
  ProfileRecord,
  ProfileRecordStore,
  ProfileVersionRecord,
} from "./profile-record-store";
import {
  parseProfileRecord,
  parseProfileVersionRecord,
} from "./profile-persistence-parser";

interface PrismaProfileRow {
  readonly commercial: unknown;
  readonly descriptionDocument: unknown;
  readonly logistics: unknown;
  readonly media: unknown;
  readonly profileId: string;
  readonly revision: number;
  readonly sku: string;
  readonly title: string;
}

interface PrismaVersionRow {
  readonly profileId: string;
  readonly revision: number;
  readonly snapshot: unknown;
}

interface PrismaProfileTransaction {
  readonly listingProfileRecord: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    updateMany(args: {
      data: Record<string, unknown>;
      where: { profileId: string; revision: number };
    }): Promise<{ count: number }>;
  };
  readonly listingProfileVersion: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

export interface ProfilePrismaClient {
  readonly listingProfileRecord: {
    findUnique(args: {
      where: { profileId: string } | { sku: string };
    }): Promise<PrismaProfileRow | null>;
  };
  readonly listingProfileVersion: {
    findMany(args: {
      orderBy: { revision: "asc" };
      where: { profileId: string };
    }): Promise<readonly PrismaVersionRow[]>;
  };
  $transaction<T>(
    operation: (transaction: PrismaProfileTransaction) => Promise<T>,
  ): Promise<T>;
}

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toRecord(row: PrismaProfileRow): ProfileRecord {
  return parseProfileRecord(jsonClone(row));
}

function recordData(record: ProfileRecord): Record<string, unknown> {
  return {
    commercial: jsonClone(record.commercial),
    descriptionDocument: jsonClone(record.descriptionDocument),
    logistics: jsonClone(record.logistics),
    media: jsonClone(record.media),
    profileId: record.profileId,
    revision: record.revision,
    sku: record.sku,
    title: record.title,
  };
}

function versionData(version: ProfileVersionRecord): Record<string, unknown> {
  return {
    profileId: version.profileId,
    revision: version.revision,
    snapshot: jsonClone(version.snapshot),
  };
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    error.code === "P2002";
}

export class PrismaProfileRecordStore implements ProfileRecordStore {
  private readonly client: ProfilePrismaClient;

  constructor(client: ProfilePrismaClient | PrismaClient) {
    this.client = client as unknown as ProfilePrismaClient;
  }

  async findById(profileId: string): Promise<ProfileRecord | null> {
    const row = await this.client.listingProfileRecord.findUnique({
      where: { profileId },
    });
    return row ? toRecord(row) : null;
  }

  async findBySku(sku: string): Promise<ProfileRecord | null> {
    const row = await this.client.listingProfileRecord.findUnique({
      where: { sku },
    });
    return row ? toRecord(row) : null;
  }

  async insert(
    record: ProfileRecord,
    version: ProfileVersionRecord,
  ): Promise<boolean> {
    try {
      await this.client.$transaction(async (transaction) => {
        await transaction.listingProfileRecord.create({
          data: recordData(record),
        });
        await transaction.listingProfileVersion.create({
          data: versionData(version),
        });
      });
      return true;
    } catch (error) {
      if (isUniqueConflict(error)) return false;
      throw error;
    }
  }

  async replace(
    record: ProfileRecord,
    expectedRevision: number,
    version: ProfileVersionRecord,
  ): Promise<boolean> {
    try {
      return await this.client.$transaction(async (transaction) => {
        const update = await transaction.listingProfileRecord.updateMany({
          data: recordData(record),
          where: { profileId: record.profileId, revision: expectedRevision },
        });
        if (update.count !== 1) return false;
        await transaction.listingProfileVersion.create({
          data: versionData(version),
        });
        return true;
      });
    } catch (error) {
      if (isUniqueConflict(error)) return false;
      throw error;
    }
  }

  async listVersions(
    profileId: string,
  ): Promise<readonly ProfileVersionRecord[]> {
    const rows = await this.client.listingProfileVersion.findMany({
      orderBy: { revision: "asc" },
      where: { profileId },
    });
    return rows.map((row) => parseProfileVersionRecord(jsonClone(row)));
  }
}
