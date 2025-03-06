import { Schema, Types } from "mongoose";
import {
  IEcosystemNegotiation,
  IEcosystemNegotiationModel,
  IEcosystemNegotiationMethods,
} from "../../types/ecosystemnegotiation";

export const ecosystemNegotiationSchema = new Schema<
  IEcosystemNegotiation,
  IEcosystemNegotiationModel,
  IEcosystemNegotiationMethods
>(
  {
    ecosystem: { type: String, required: true },
    participant: { type: String, required: true },
    policies: [
      {
        serviceOffering: { type: String },
        policy: [
          {
            ruleId: { type: String, required: true },
            values: {
              type: Schema.Types.Mixed,
              required: true,
            },
          },
        ],
      },
    ],
    pricings: [
      {
        serviceOffering: { type: String },
        pricingModel: [{ type: String }],
        pricingDescription: { type: String },
        pricing: { type: String },
        billingPeriod: { type: String },
        currency: { type: String },
      },
    ],
    status: { type: String, required: true },
    latestNegotiator: { type: String, required: true },
    schema_version: { type: String, default: "1" },
  },
  {
    timestamps: true,
    query: {},
  }
);
