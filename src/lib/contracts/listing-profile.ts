import type { DescriptionDocument } from "./description-document";

export interface ListingIdentity {
  readonly profileId: string;
  readonly sku: string;
  readonly title: string;
}

export interface Money {
  readonly amount: string;
  readonly currency: string;
}

export type ListingCondition = "new" | "open-box" | "refurbished" | "used";

export interface ListingCommercial {
  readonly condition: ListingCondition;
  readonly price: Money;
  readonly quantity: number;
}

export interface ListingLogistics {
  readonly dispatchTimeMaxDays: number;
  readonly packageWeightGrams: number;
  readonly returnsAccepted: boolean;
}

export interface ListingImage {
  readonly alt: string;
  readonly url: string;
}

export interface ListingMedia {
  readonly images: readonly ListingImage[];
}

export interface ListingProfile {
  readonly commercial: ListingCommercial;
  readonly descriptionDocument: DescriptionDocument;
  readonly identity: ListingIdentity;
  readonly logistics: ListingLogistics;
  readonly media: ListingMedia;
  readonly revision: number;
}
