import { describe, expect, it } from "vitest";

import type { ListingProfile } from "../../src/lib/contracts";
import {
  ProfilePersistenceDataError,
  PrismaProfileRecordStore,
  type ProfilePrismaClient,
  type ProfileRecord,
  type ProfileVersionRecord,
} from "../../src/lib/profiles";

function profile(revision: number): ListingProfile {
  return {
    identity: { profileId: "p-1", sku: "SKU-1", title: `Title ${revision}` },
    revision,
    commercial: {
      condition: "new",
      price: { amount: "10.00", currency: "USD" },
      quantity: 1,
    },
    logistics: {
      dispatchTimeMaxDays: 1,
      packageWeightGrams: 100,
      returnsAccepted: true,
    },
    media: { images: [] },
    descriptionDocument: {
      schemaVersion: 1,
      theme: {
        backgroundColor: "#ffffff",
        fontFamily: "Arial, sans-serif",
        primaryColor: "#000000",
        textColor: "#111111",
      },
      blocks: [],
    },
  };
}

function record(value: ListingProfile): ProfileRecord {
  return {
    profileId: value.identity.profileId,
    sku: value.identity.sku,
    title: value.identity.title,
    revision: value.revision,
    commercial: value.commercial,
    logistics: value.logistics,
    media: value.media,
    descriptionDocument: value.descriptionDocument,
  };
}

function version(value: ListingProfile): ProfileVersionRecord {
  return {
    profileId: value.identity.profileId,
    revision: value.revision,
    snapshot: value,
  };
}

interface MemoryPrismaHarness {
  readonly client: ProfilePrismaClient;
  seedVersion(value: ProfileVersionRecord): void;
}

function createMemoryPrismaClient(): MemoryPrismaHarness {
  const profiles = new Map<string, ProfileRecord>();
  const versions: ProfileVersionRecord[] = [];

  const client: ProfilePrismaClient = {
    listingProfileRecord: {
      findUnique: async ({ where }) => {
        if ("profileId" in where) return profiles.get(where.profileId) ?? null;
        return [...profiles.values()].find((row) => row.sku === where.sku) ?? null;
      },
    },
    listingProfileVersion: {
      findMany: async ({ where }) => versions
        .filter((row) => row.profileId === where.profileId)
        .sort((left, right) => left.revision - right.revision),
    },
    $transaction: async (operation) => {
      const stagedProfiles = new Map(
        [...profiles].map(([key, value]) => [key, structuredClone(value)]),
      );
      const stagedVersions = structuredClone(versions);
      const transaction = {
        listingProfileRecord: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            const profileId = String(data.profileId);
            const sku = String(data.sku);
            if (stagedProfiles.has(profileId) ||
                [...stagedProfiles.values()].some((row) => row.sku === sku)) {
              throw { code: "P2002" };
            }
            stagedProfiles.set(
              profileId,
              structuredClone(data) as unknown as ProfileRecord,
            );
            return data;
          },
          updateMany: async ({
            data,
            where,
          }: {
            data: Record<string, unknown>;
            where: { profileId: string; revision: number };
          }) => {
            const current = stagedProfiles.get(where.profileId);
            if (!current || current.revision !== where.revision) {
              return { count: 0 };
            }
            stagedProfiles.set(where.profileId, {
              ...current,
              ...structuredClone(data),
            } as ProfileRecord);
            return { count: 1 };
          },
        },
        listingProfileVersion: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            const profileId = String(data.profileId);
            const revision = Number(data.revision);
            if (stagedVersions.some(
              (row) => row.profileId === profileId && row.revision === revision,
            )) {
              throw { code: "P2002" };
            }
            stagedVersions.push(
              structuredClone(data) as unknown as ProfileVersionRecord,
            );
            return data;
          },
        },
      };

      const result = await operation(transaction);
      profiles.clear();
      for (const [key, value] of stagedProfiles) profiles.set(key, value);
      versions.splice(0, versions.length, ...stagedVersions);
      return result;
    },
  };
  return {
    client,
    seedVersion(value) {
      versions.push(structuredClone(value));
    },
  };
}

describe("PrismaProfileRecordStore", () => {
  it("rechaza JSON persistido que no cumple los contratos de dominio", async () => {
    const { client } = createMemoryPrismaClient();
    await client.$transaction(async (transaction) => {
      await transaction.listingProfileRecord.create({
        data: {
          ...record(profile(1)),
          descriptionDocument: {
            ...profile(1).descriptionDocument,
            schemaVersion: 2,
          },
        },
      });
    });

    const store = new PrismaProfileRecordStore(client);

    await expect(store.findById("p-1")).rejects.toBeInstanceOf(
      ProfilePersistenceDataError,
    );
  });

  it("rechaza snapshots cuya identidad o revisión contradice la fila", async () => {
    const { client } = createMemoryPrismaClient();
    await client.$transaction(async (transaction) => {
      await transaction.listingProfileVersion.create({
        data: {
          ...version(profile(1)),
          snapshot: {
            ...profile(1),
            identity: { ...profile(1).identity, profileId: "otro" },
          },
        },
      });
    });

    const store = new PrismaProfileRecordStore(client);

    await expect(store.listVersions("p-1")).rejects.toBeInstanceOf(
      ProfilePersistenceDataError,
    );
  });

  it("rechaza snapshots cuya revisión contradice la fila", async () => {
    const { client } = createMemoryPrismaClient();
    await client.$transaction(async (transaction) => {
      await transaction.listingProfileVersion.create({
        data: {
          ...version(profile(1)),
          revision: 2,
        },
      });
    });

    const store = new PrismaProfileRecordStore(client);

    await expect(store.listVersions("p-1")).rejects.toBeInstanceOf(
      ProfilePersistenceDataError,
    );
  });

  it("persiste y reemplaza atómicamente registros y snapshots", async () => {
    const { client } = createMemoryPrismaClient();
    const store = new PrismaProfileRecordStore(client);
    const first = profile(1);
    const second = profile(2);

    await expect(store.insert(record(first), version(first))).resolves.toBe(true);
    await expect(store.findById("p-1")).resolves.toEqual(record(first));
    await expect(store.findBySku("SKU-1")).resolves.toEqual(record(first));
    await expect(
      store.replace(record(second), 1, version(second)),
    ).resolves.toBe(true);
    await expect(
      store.replace(record(profile(3)), 1, version(profile(3))),
    ).resolves.toBe(false);
    await expect(store.listVersions("p-1")).resolves.toEqual([
      version(first),
      version(second),
    ]);
  });

  it("revierte el perfil actual si falla el snapshot del reemplazo", async () => {
    const harness = createMemoryPrismaClient();
    const store = new PrismaProfileRecordStore(harness.client);
    const first = profile(1);
    const second = profile(2);
    await store.insert(record(first), version(first));

    harness.seedVersion(version(second));

    await expect(store.replace(record(second), 1, version(second))).resolves.toBe(
      false,
    );
    await expect(store.findById("p-1")).resolves.toEqual(record(first));
    await expect(store.listVersions("p-1")).resolves.toEqual([
      version(first),
      version(second),
    ]);
  });

  it("traduce colisiones únicas de profileId y SKU a un insert fallido", async () => {
    const { client } = createMemoryPrismaClient();
    const store = new PrismaProfileRecordStore(client);
    const first = profile(1);
    const sameSku = {
      ...first,
      identity: { ...first.identity, profileId: "p-2" },
    };

    await expect(store.insert(record(first), version(first))).resolves.toBe(true);
    await expect(store.insert(record(first), version(first))).resolves.toBe(false);
    await expect(store.insert(record(sameSku), version(sameSku))).resolves.toBe(
      false,
    );
    await expect(store.findBySku("SKU-1")).resolves.toEqual(record(first));
    await expect(store.listVersions("p-1")).resolves.toEqual([version(first)]);
  });
});
