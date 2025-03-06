import { getDocumentId } from "../../utils/mongooseDocumentHelpers";
import { Ecosystem, Participant, ServiceOffering } from "../../models";
import {
  IEcosystemNegotiation,
  PolicyConfiguration,
  PricingConfiguration,
} from "../../types/ecosystemnegotiation";
import { EcosystemNegotiation } from "../../models/EcosystemNegotiation";
import { ecosystemNegotiationPopulation } from "../../utils/mongoosePopulations";

type EcosystemRepositoryBehaviourOptions = {
  /**
   * Whether to throw an error if the negotiation is not found
   * @default true
   */
  throwOnNotFound?: boolean;
};

export class EcosystemNegotiationService {
  /**
   * The participant that is currently acting on the negotiation
   */
  negotiatorId: string | undefined = undefined;

  /**
   * Population options to check for when populating the negotiation
   */
  private populateOptions = ["all", "participant", "ecosystem"];

  constructor(negotiatorId?: string) {
    this.negotiatorId = negotiatorId;
  }

  /**
   * Handles the creation of a new negotiation between a participant and
   * an orchestrator of an ecosystem. This can happen on both an invitation
   * or a join request.
   */
  public async createNegotiation({
    ecosystemId,
    participantId,
    policies,
    roles,
    pricing,
  }: {
    ecosystemId: string;
    participantId: string;
    policies: PolicyConfiguration[];
    roles: string[];
    pricing: PricingConfiguration[];
  }) {
    const existing = await this.findNegotiationForParticipantInEcosystem({
      participantId,
      ecosystemId,
      options: { throwOnNotFound: false },
    });

    if (existing) {
      throw new Error("Negotiation already exists");
    }

    // TODO Should be in ParticipantService / Repository
    const participant = await Participant.findById(participantId).lean();
    if (!participant) {
      throw new Error("Participant not found");
    }

    // This acts as an invitation to an ecosystem as well, so we need to formulate this invitation
    // TODO should be in the EcosystemsService / Repository
    const ecosystem = await Ecosystem.findById(ecosystemId);
    if (!ecosystem) {
      throw new Error("Ecosystem not found");
    }

    // Verify that the participant owns all service offerings
    await this.verifyOfferingsOwnership(participantId, policies, pricing);

    await ecosystem.invite({
      participant: participantId,
      roles,
    });

    const negotiation = new EcosystemNegotiation({
      ecosystem: ecosystemId,
      participant: participantId,
      status: "Requested",
      policies,
      latestNegotiator: this.negotiatorId,
      pricings: pricing,
      orchestrator: participantId,
    });

    await negotiation.save();
    return negotiation.toObject();
  }

  /**
   * Enables an orchestrator / participant to negotiate on the proposed
   * policies and pricing configurations for a negotiation. Only the non
   * latest negotiator can negotiate on the negotiation.
   */
  public async negotiateOnNegotiation({
    negotiationId,
    policies,
    pricing,
  }: {
    negotiationId: string;
    policies: PolicyConfiguration[];
    pricing: PricingConfiguration[];
  }) {
    if (!this.negotiatorId) {
      throw new Error("Negotiator ID not set");
    }

    const negotiation = await EcosystemNegotiation.findById(
      negotiationId
    ).lean();

    if (
      negotiation.latestNegotiator === this.negotiatorId &&
      negotiation.status !== "Accepted" // Don't block if already accepted to enable re-negotiation
    ) {
      throw new Error("Negotiator has already negotiated");
    }

    if (negotiation.status === "Terminated") {
      throw new Error("Negotiation has been terminated");
    }

    // Verify that the participant owns all service offerings
    await this.verifyOfferingsOwnership(
      getDocumentId(negotiation.participant),
      policies,
      pricing
    );

    const updated = await EcosystemNegotiation.findByIdAndUpdate(
      negotiationId,
      {
        policies,
        pricings: pricing,
        latestNegotiator: this.negotiatorId,
        status: "Negotiation",
      },
      {
        new: true,
      }
    );

    return updated.toObject();
  }

  /**
   * Allows a participant to accept a negotiation. The resulting negotiation
   * will have the latestNegotiator be the one who accepted the negotiation.
   */
  public async acceptNegotiation(negotiationId: string) {
    if (!this.negotiatorId) throw new Error("Negotiator ID not set");

    const negotiation = await EcosystemNegotiation.findById(negotiationId);

    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    if (negotiation.latestNegotiator === this.negotiatorId) {
      throw new Error("Negotiator cannot accept their own negotiation");
    }

    if (negotiation.status === "Terminated") {
      throw new Error("Negotiation has been terminated");
    }

    const updated = await EcosystemNegotiation.findByIdAndUpdate(
      negotiationId,
      {
        status: "Accepted",
        latestNegotiator: this.negotiatorId,
      },
      { new: true }
    );

    return updated.toObject();
  }

  /**
   * Allows a participant to terminate a negotiation. The resulting
   * negotiation will have the latestNegotiator be the one who terminated
   * the negotiation.
   */
  public async terminateNegotiation(negotiationId: string) {
    const updated = await EcosystemNegotiation.findByIdAndUpdate(
      negotiationId,
      {
        status: "Terminated",
        latestNegotiator: this.negotiatorId,
      },
      { new: true }
    );

    if (!updated) {
      throw new Error("Negotiation not found");
    }

    return updated.toObject();
  }

  //#region Repository Methods
  public async findNegotiationById(
    negotiationId: string,
    populateOption = "all",
    options: EcosystemRepositoryBehaviourOptions = {
      throwOnNotFound: true,
    }
  ): Promise<IEcosystemNegotiation> {
    if (!this.populateOptions.includes(populateOption)) populateOption = "all";

    const nego = await EcosystemNegotiation.findById(negotiationId).populate(
      ecosystemNegotiationPopulation[populateOption]
    );

    if (!nego && options.throwOnNotFound) {
      throw new Error("Negotiation not found");
    }

    return nego.toObject();
  }

  public async findNegotiationsForParticipant(
    participantId: string,
    populateOption = "all"
  ) {
    if (!this.populateOptions.includes(populateOption)) populateOption = "all";

    const ecosystems = await Ecosystem.find({
      orchestrator: participantId,
    })
      .select("_id")
      .lean();

    const ecosystemIds = ecosystems.map((e) => e._id?.toString());

    const negos = await EcosystemNegotiation.find({
      $or: [
        { ecosystem: { $in: ecosystemIds } },
        {
          participant: participantId,
        },
        { latestNegotiator: participantId },
      ],
    })
      .populate(ecosystemNegotiationPopulation[populateOption])
      .lean();

    return negos;
  }

  public async findNegotiationForParticipantInEcosystem({
    participantId,
    ecosystemId,
    populateOption = "all",
    options = {
      throwOnNotFound: true,
    },
  }: {
    participantId: string;
    ecosystemId: string;
    populateOption?: string;
    options?: EcosystemRepositoryBehaviourOptions;
  }) {
    if (!this.populateOptions.includes(populateOption)) populateOption = "all";

    const nego = await EcosystemNegotiation.findOne({
      participant: participantId,
      ecosystem: ecosystemId,
    })
      .populate(ecosystemNegotiationPopulation[populateOption])
      .lean();

    if (!nego && options.throwOnNotFound) {
      throw new Error("Negotiation not found");
    }

    return nego;
  }
  //#endregion

  /**
   * Verifies that all service offerings provided in the negotiation
   * are owned by the participant.
   *
   * @param participantId The participant ID (not the orchestrator)
   * @param policies The policies provided for the negotiation
   * @param pricing The pricing configurations provided for the negotiation
   */
  private async verifyOfferingsOwnership(
    participantId: string,
    policies: PolicyConfiguration[],
    pricing: PricingConfiguration[]
  ) {
    const offeringPromises = [
      ...policies.map((policy) => {
        return ServiceOffering.findOne({
          _id: policy.serviceOffering,
          providedBy: participantId,
        });
      }),
      ...pricing.map((price) => {
        return ServiceOffering.findOne({
          _id: price.serviceOffering,
          providedBy: participantId,
        });
      }),
    ];

    const result = await Promise.all(offeringPromises);
    const ownership = result.every((r) => !!r);

    if (!ownership) {
      throw new Error("Participant does not own all service offerings");
    }

    return ownership;
  }
}
