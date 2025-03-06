import { Model } from "mongoose";
import { AllSchemas } from "./models";

/**
 * Representation of the configuration of policies for a service offering
 */
export type PolicyConfiguration = {
  /**
   * Id of the service offering
   */
  serviceOffering: string;

  /**
   * CONFIGURED policies for this service offering
   * that applies to this ecosystem
   */
  policy: {
    /**
     * uid of the rule in the registry
     */
    ruleId: string;

    /**
     * Values depending on the requested fields of the rule
     */
    values: { [requestedField: string]: string | Date | number };
  }[];
};

/**
 * Representation of the configuration of pricing info for a service offering
 */
export type PricingConfiguration = {
  /**
   * Id of the service offering
   */
  serviceOffering: string;

  /**
   * model of the pricing
   */
  pricingModel?: string[];

  /**
   * description of the pricing
   */
  pricingDescription: string;

  /**
   * value of the pricing
   */
  pricing: number;

  /**
   * Currency of the pricing
   *
   * Field is optional because it was added after the initial creation
   */
  currency?: string;

  /**
   * Billing period of the pricing
   *
   * Field is optional because it was added after the initial creation
   */
  billingPeriod?: string;

  /**
   * Cost per API call
   */
  costPerAPICall?: number;

  /**
   * Setup fee
   */
  setupFee?: number;
};

export interface IEcosystemNegotiation extends AllSchemas {
  /**
   * ID of the ecosystem
   */
  ecosystem: string;

  /**
   * ID of the participant joining the ecosystem
   */
  participant: string;

  /**
   * Service offerings and policies selected by the orchestrator
   */
  policies: PolicyConfiguration[];

  /**
   * Service offerings and pricings selected by the orchestrator
   */
  pricings: PricingConfiguration[];

  /**
   * Status of the negotiation
   */
  status: "Requested" | "Negotiation" | "Accepted" | "Terminated";

  /**
   * ID of the latest negotiatior (participant or orchestrator)
   */
  latestNegotiator: string;
}

export interface IEcosystemNegotiationMethods {}

export interface IEcosystemNegotiationModel
  extends Model<IEcosystemNegotiation, object, IEcosystemNegotiationMethods> {}
