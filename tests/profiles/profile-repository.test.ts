import { describe, expect, it } from "vitest";

import type { ListingProfile } from "../../src/lib/contracts";
import {
  PersistentListingProfileRepository,
  ProfileIdentityConflictError,
  type ProfileRecord,
  type ProfileRecordStore,
  ProfileRevisionConflictError,
  type ProfileVersionRecord,
  ProfileWriteConflictError,
} from "../../src/lib/profiles";

class MemoryProfileRecordStore implements ProfileRecordStore {
  failNextReplace = false;
  readonly profiles = new Map<string, ProfileRecord>();
  readonly versions: ProfileVersionRecord[] = [];

  async findById(profileId: string): Promise<ProfileRecord | null> {
    return this.profiles.get(profileId) ?? null;
  }

  async findBySku(sku: string): Promise<ProfileRecord | null> {
    return [...this.profiles.values()].find((profile) => profile.sku === sku) ?? null;
  }

  async insert(
    record: ProfileRecord,
    version: ProfileVersionRecord,
  ): Promise<boolean> {
    if (this.profiles.has(record.profileId) ||
        [...this.profiles.values()].some((profile) => profile.sku === record.sku)) {
      return false;
    }
    this.profiles.set(record.profileId, structuredClone(record));
    this.versions.push(structuredClone(version));
    return true;
  }

  async replace(
    record: ProfileRecord,
    expectedRevision: number,
    version: ProfileVersionRecord,
  ): Promise<boolean> {
    if (this.failNextReplace) {
      this.failNextReplace = false;
      return false;
    }
    const current = this.profiles.get(record.profileId);
    if (!current || current.revision !== expectedRevision) return false;
    this.profiles.set(record.profileId, structuredClone(record));
    this.versions.push(structuredClone(version));
    return true;
  }

  async listVersions(profileId: string): Promise<readonly ProfileVersionRecord[]> {
    return this.versions
      .filter((version) => version.profileId === profileId)
      .map((version) => structuredClone(version));
  }
}

function createProfile(revision = 1): ListingProfile {
  return {
    identity: {
      profileId: "profile-1",
      sku: "GARMIN-001",
      title: "Garmin DriveSmart",
    },
    revision,
    commercial: {
      condition: "new",
      price: { amount: "299.99", currency: "USD" },
      quantity: 4,
    },
    logistics: {
      dispatchTimeMaxDays: 2,
      packageWeightGrams: 850,
      returnsAccepted: true,
    },
    media: {
      images: [
        { alt: "Garmin front", url: "https://cdn.example.test/garmin.jpg" },
      ],
    },
    descriptionDocument: {
      schemaVersion: 1,
      theme: {
        backgroundColor: "#ffffff",
        fontFamily: "Arial, sans-serif",
        primaryColor: "#005ea8",
        textColor: "#111111",
      },
      blocks: [
        { id: "intro", type: "paragraph", text: "Navigation made simple." },
      ],
    },
  };
}

describe("PersistentListingProfileRepository", () => {
  it("guarda la revisión inicial y permite leerla por ID y SKU", async () => {
    const store = new MemoryProfileRecordStore();
    const repository = new PersistentListingProfileRepository(store);
    const profile = createProfile();

    await repository.save(profile);

    await expect(repository.findById("profile-1")).resolves.toEqual(profile);
    await expect(repository.findBySku("GARMIN-001")).resolves.toEqual(profile);
    await expect(repository.listVersions("profile-1")).resolves.toEqual([
      { profileId: "profile-1", revision: 1, profile },
    ]);
  });

  it("actualiza una revisión consecutiva y conserva el historial", async () => {
    const store = new MemoryProfileRecordStore();
    const repository = new PersistentListingProfileRepository(store);
    const first = createProfile();
    const second: ListingProfile = {
      ...createProfile(2),
      identity: { ...first.identity, title: "Garmin DriveSmart 76" },
      commercial: { ...first.commercial, quantity: 3 },
    };

    await repository.save(first);
    await repository.save(second);

    await expect(repository.findById("profile-1")).resolves.toEqual(second);
    const versions = await repository.listVersions("profile-1");
    expect(versions.map((version) => version.revision)).toEqual([1, 2]);
    expect(versions[0]?.profile).toEqual(first);
    expect(versions[1]?.profile).toEqual(second);
  });

  it("rechaza revisiones iniciales o consecutivas inválidas", async () => {
    const repository = new PersistentListingProfileRepository(
      new MemoryProfileRecordStore(),
    );

    await expect(repository.save(createProfile(2))).rejects.toBeInstanceOf(
      ProfileRevisionConflictError,
    );

    await repository.save(createProfile(1));
    await expect(repository.save(createProfile(3))).rejects.toBeInstanceOf(
      ProfileRevisionConflictError,
    );
  });

  it("mantiene profileId y SKU como identidades estables", async () => {
    const repository = new PersistentListingProfileRepository(
      new MemoryProfileRecordStore(),
    );
    await repository.save(createProfile());
    const changedSku: ListingProfile = {
      ...createProfile(2),
      identity: { ...createProfile(2).identity, sku: "OTHER-SKU" },
    };

    await expect(repository.save(changedSku)).rejects.toBeInstanceOf(
      ProfileIdentityConflictError,
    );
  });

  it("expone una colisión concurrente sin perder el snapshot anterior", async () => {
    const store = new MemoryProfileRecordStore();
    const repository = new PersistentListingProfileRepository(store);
    const first = createProfile();
    await repository.save(first);
    store.failNextReplace = true;

    await expect(repository.save(createProfile(2))).rejects.toBeInstanceOf(
      ProfileWriteConflictError,
    );
    await expect(repository.findById("profile-1")).resolves.toEqual(first);
    await expect(repository.listVersions("profile-1")).resolves.toHaveLength(1);
  });

  it("rechaza un SKU ya asignado a otro profileId", async () => {
    const repository = new PersistentListingProfileRepository(
      new MemoryProfileRecordStore(),
    );
    const first = createProfile();
    const duplicateSku: ListingProfile = {
      ...createProfile(),
      identity: { ...first.identity, profileId: "profile-2" },
    };

    await repository.save(first);

    await expect(repository.save(duplicateSku)).rejects.toBeInstanceOf(
      ProfileWriteConflictError,
    );
    await expect(repository.findBySku(first.identity.sku)).resolves.toEqual(first);
  });

  it("aísla el estado persistido de mutaciones de entrada y salida", async () => {
    const repository = new PersistentListingProfileRepository(
      new MemoryProfileRecordStore(),
    );
    const input = createProfile();
    const expected = structuredClone(input);

    await repository.save(input);
    (input.commercial as { quantity: number }).quantity = 99;

    const output = await repository.findById("profile-1");
    expect(output).toEqual(expected);
    (output?.media.images as { alt: string; url: string }[])[0]!.alt = "mutated";

    await expect(repository.findById("profile-1")).resolves.toEqual(expected);
    await expect(repository.listVersions("profile-1")).resolves.toEqual([
      { profileId: "profile-1", revision: 1, profile: expected },
    ]);
  });
});
