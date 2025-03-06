import { NextFunction, Request, Response } from "express";
import { Ecosystem, ExchangeConfiguration } from "../../../models";
import {
  exchangeConfigurationPopulation,
  serviceOfferingPopulation,
} from "../../../utils/schemaPopulation";
import { getDocumentId } from "../../../utils/mongooseDocumentHelpers";
import { generateBilateralContract } from "../../../libs/contract";
import { IParticipant } from "../../../types/participant";
import { IServiceOffering } from "../../../types/serviceoffering";
import {
  batchInjectPoliciesInBilateralContract,
  batchInjectPoliciesServiceOfferingEcosystemContract,
  deletePoliciesServiceOfferingEcosystemContract,
} from "../../../libs/contract/policyInjector";
import { signBilateralContract } from "../../../libs/contract/signatures";
import { EcosystemNegotiationService } from "../../../services/negotiation/EcosystemNegotiation.service";
import {
  PolicyConfiguration,
  PricingConfiguration,
} from "../../../types/ecosystemnegotiation";
import { EcosystemNegotiation } from "../../../models/EcosystemNegotiation";

/**
 * Returns all exchange configurations for a participant
 */
export const getMyExchangeConfigurations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ecs = await ExchangeConfiguration.find({
      $or: [{ provider: req.user.id }, { consumer: req.user.id }],
    })
      .populate(exchangeConfigurationPopulation)
      .lean();

    return res.json(ecs);
  } catch (err) {
    next(err);
  }
};

/**
 * Returns a exchange configuration by ID
 */
export const getExchangeConfigurationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const exchangeConf = await ExchangeConfiguration.findById(id)
      .populate(exchangeConfigurationPopulation)
      .lean();

    if (!exchangeConf)
      return res.status(404).json({
        code: 404,
        errorMsg: "Resource not found",
        message: "Exchange Configuration not found",
      });

    return res.json(exchangeConf);
  } catch (err) {
    next(err);
  }
};

/**
 * Creates a service offering access request
 */
export const createServiceOfferingAccessRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      provider,
      consumer,
      providerServiceOffering,
      consumerServiceOffering,
    } = req.body;

    const existing = await ExchangeConfiguration.findOne({
      consumer,
      provider,
      providerServiceOffering,
      consumerServiceOffering,
    }).lean();

    if (existing) {
      return res.status(409).json({
        code: 409,
        errorMsg: "conflicting resource",
        message:
          "An access request for this configuration already exists with id: " +
          existing._id,
      });
    }

    const exchangeConfiguration = new ExchangeConfiguration();
    const result = await exchangeConfiguration.request({
      provider,
      consumer,
      providerServiceOffering,
      consumerServiceOffering,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Authorizes a service offering access request
 */
export const authorizeExchangeConfiguration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { policy } = req.body;

    const exchangeConf = await ExchangeConfiguration.findById(id);

    if (!exchangeConf) {
      return res.status(404).json({
        code: 404,
        errorMsg: "Resource not found",
        message: "Exchange Configuration could not be found",
      });
    }

    if (exchangeConf.provider.toString() !== req.user.id.toString()) {
      return res.status(400).json({
        code: 400,
        errorMsg: "Resource error",
        message: "Exchange Configuration could not be authorized",
      });
    }

    if (exchangeConf.negotiationStatus === "Authorized") {
      return res.status(400).json({
        code: 400,
        errorMsg: "Invalid operation",
        message: "Exchange configuration has already been authorized",
      });
    }

    if (getDocumentId(exchangeConf.provider) !== req.user.id) {
      return res.status(401).json({ error: "Unauthorized operation" });
    }

    try {
      const contract = await generateBilateralContract({
        dataConsumer: exchangeConf.consumer,
        dataProvider: exchangeConf.provider,
        serviceOffering: exchangeConf.providerServiceOffering,
      });

      if (!contract)
        throw new Error("Contract was not returned by Contract Service");

      exchangeConf.contract = contract._id;
    } catch (err) {
      return res
        .status(409)
        .json({ error: "Failed to generate contract: " + err.message });
    }

    exchangeConf.providerPolicies = policy;
    exchangeConf.negotiationStatus = "Authorized";
    exchangeConf.latestNegotiator = req.user.id;

    await exchangeConf.save();
    return res.status(200).json(exchangeConf);
  } catch (err) {
    next(err);
  }
};

/**
 * Negociates policies on the access of resources
 * in the exchange configuration
 */
export const negotiateExchangeConfigurationPolicy = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { policy } = req.body;

    const exchangeConf = await ExchangeConfiguration.findById(id);

    if (!exchangeConf) {
      return res.status(404).json({
        code: 404,
        errorMsg: "Resource not found",
        message: "Exchange Configuration could not be found",
      });
    }

    exchangeConf.providerPolicies = policy;
    exchangeConf.negotiationStatus = "Negotiation";
    exchangeConf.latestNegotiator = req.user.id;

    await exchangeConf.save();
    return res.json(exchangeConf);
  } catch (err) {
    next(err);
  }
};

/**
 * Accepts the negotiation and proceeds to pass the
 * negotiation exchange configuration as pending signature
 */
export const acceptNegotiation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const exchangeConf = await ExchangeConfiguration.findById(id);

    if (!exchangeConf) {
      return res.status(404).json({
        code: 404,
        errorMsg: "Resource not found",
        message: "Exchange Configuration could not be found",
      });
    }

    if (exchangeConf.negotiationStatus === "SignatureReady") {
      return res.status(400).json({
        code: 400,
        errorMsg: "Invalid operation",
        message:
          "Exchange configuration has already been validated and is pending signatures",
      });
    }

    exchangeConf.negotiationStatus = "SignatureReady";

    await exchangeConf.save();

    return res.json(exchangeConf);
  } catch (err) {
    next(err);
  }
};

/**
 * Called by a participant to sign the service offering access request
 * and thus the bilateral contract associated
 */
export const signExchangeConfiguration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { signature } = req.body;

    const exchangeConf = await ExchangeConfiguration.findById(id).populate<{
      provider: IParticipant;
      consumer: IParticipant;
      providerServiceOffering: IServiceOffering;
      consumerServiceOffering: IServiceOffering;
    }>([
      {
        path: "provider",
        model: "Participant",
      },
      {
        path: "consumer",
        model: "Participant",
      },
      {
        path: "providerServiceOffering",
        model: "ServiceOffering",
        populate: serviceOfferingPopulation,
      },
      {
        path: "consumerServiceOffering",
        model: "ServiceOffering",
        populate: serviceOfferingPopulation,
      },
    ]);

    if (!exchangeConf) {
      return res.status(404).json({
        code: 404,
        errorMsg: "Resource not found",
        message: "Exchange Configuration could not be found",
      });
    }

    if (exchangeConf.negotiationStatus !== "SignatureReady") {
      return res.status(400).json({
        code: 400,
        errorMsg: "Invalid operation",
        message: "Exchange configuration is not ready for signature",
      });
    }

    const signingParty =
      req.user.id === getDocumentId(exchangeConf.provider)
        ? "provider"
        : "consumer";

    exchangeConf.signatures[signingParty] = signature;

    try {
      // If both have applied signatures, we can inject the policies
      // this avoid injecting the same policies multiple times
      if (
        exchangeConf.signatures.consumer &&
        exchangeConf.signatures.provider
      ) {
        await batchInjectPoliciesInBilateralContract({
          contractId: exchangeConf.contract,
          rules: exchangeConf.providerPolicies,
        });
      }
    } catch (err) {
      return res.status(409).json({
        error: "Failed to inject policies in bilateral contract",
      });
    }

    let contract = null;

    try {
      contract = await signBilateralContract({
        contractId: exchangeConf.contract,
        signature: {
          did: req.user.id,
          party: req.user.id,
          value: signature,
        },
      });
      if (contract.status === "signed") {
        exchangeConf.negotiationStatus = "Signed";
      }
    } catch (err) {
      return res.status(409).json({ error: "Failed to sign contract" });
    }

    await exchangeConf.save();

    // The client can handle UI to show depending on the contract status
    return res.json({
      code: 200,
      data: { exchangeConfiguration: exchangeConf, contract },
      message: "Successfully updated exchange configuration",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Returns the user ecosystem negotiations
 */
export const getMyEcosystemNegotiations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { populate } = req.query;
    const negotiationService = new EcosystemNegotiationService(req.user.id);

    const option = populate?.toString();

    const negos = await negotiationService.findNegotiationsForParticipant(
      req.user.id,
      option
    );

    return res.status(200).json(negos);
  } catch (err) {
    next(err);
  }
};

/**
 * Returns the ecosystem negotiation document by ID
 */
export const getEcosystemNegotiationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const service = new EcosystemNegotiationService(req.user.id);

    const nego = await service.findNegotiationById(
      req.params.id,
      req.query.populate?.toString()
    );

    return res.status(200).json(nego);
  } catch (err) {
    next(err);
  }
};

/**
 * Returns the ecosystem negotiation document for a participant in a given ecosystem
 */
export const getEcosystemNegotiationForParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const service = new EcosystemNegotiationService(req.user.id);

    const nego = await service.findNegotiationForParticipantInEcosystem({
      participantId: req.params.participantId,
      ecosystemId: req.params.ecosystemId,
      populateOption: req.query.populate?.toString(),
    });

    return res.status(200).json(nego);
  } catch (err) {
    next(err);
  }
};

export const createEcosystemNegotiation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ecosystem, participant, policies, roles, pricings } = req.body;
    const initiatorId = req.user.id;

    const service = new EcosystemNegotiationService(initiatorId);
    const negotiation = await service.createNegotiation({
      ecosystemId: ecosystem,
      participantId: participant,
      policies,
      roles,
      pricing: pricings,
    });

    return res.status(201).json(negotiation);
  } catch (err) {
    next(err);
  }
};

export const negotiateEcosystemNegotiationPolicies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ecosystemId } = req.params;
    const { policies, participant, pricings } = req.body;
    const initiatorId = req.user.id;

    const service = new EcosystemNegotiationService(initiatorId);

    const [negotiation, ecosystem] = await Promise.all([
      EcosystemNegotiation.findOne({
        ecosystem: ecosystemId,
        participant,
      }).lean(),
      Ecosystem.findById(ecosystemId).lean(),
    ]);

    const negotiatedNegotiation = await service.negotiateOnNegotiation({
      negotiationId: negotiation._id?.toString(),
      policies,
      pricing: pricings,
    });

    return res.status(200).json(negotiatedNegotiation);
  } catch (err) {
    next(err);
  }
};

export const acceptEcosystemNegotiation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ecosystemId } = req.params;
    const { participant } = req.body;
    const initiatorId = req.user.id;

    const service = new EcosystemNegotiationService(initiatorId);

    const [ecosystemDocument, negotiation] = await Promise.all([
      Ecosystem.findById(ecosystemId),
      service.findNegotiationForParticipantInEcosystem({
        participantId: participant,
        ecosystemId,
      }),
    ]);

    if (!ecosystemDocument) throw new Error("Ecosystem not found");

    await service.acceptNegotiation(negotiation._id?.toString());

    // Adding this to fix the negotiation methods if the participant
    // is populated.
    const fullNego = { ...negotiation };
    negotiation.participant = getDocumentId(participant);

    try {
      if (!ecosystemDocument.contract)
        throw new Error(`No contract available on excosystem ${ecosystemId}`);

      try {
        const offerings: PolicyConfiguration[] = negotiation.policies;

        if (!offerings) {
          throw new Error("No offering found, can't inject policies");
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error({
          location: "negotiation.acceptEcosystemNegotiation",
          message: "Failed to inject policies in ecosystem contract",
        });
        return res.status(409).json({
          error: "Failed to inject policies in ecosystem contract",
          dev: JSON.stringify(err ?? ""),
        });
      }
    } catch (err) {
      return res
        .status(409)
        .json({ error: "Failed retrieving contract: " + err.message });
    }

    const isParticipantAlreadyInEcosystem = ecosystemDocument.participants.find(
      (p) => getDocumentId(p.participant) === getDocumentId(participant)
    );

    // Include participant in ecosystem (accept invite / authorize join request)
    const existingInvitation = ecosystemDocument.invitations.find(
      (el) =>
        getDocumentId(el.participant) ===
          getDocumentId(negotiation.participant) && el.status === "Pending"
    );

    negotiation.policies = negotiation.policies.map((el) => ({
      ...el,
      serviceOffering: getDocumentId(el.serviceOffering),
    }));

    if (existingInvitation) {
      existingInvitation.offerings = negotiation.policies;
      existingInvitation.status = "Authorized";
      await existingInvitation.save();

      if (!isParticipantAlreadyInEcosystem) {
        ecosystemDocument.participants.push({
          participant: getDocumentId(negotiation.participant),
          offerings: negotiation.policies,
          roles: existingInvitation.roles,
        });

        await ecosystemDocument.save();
      }
    }

    if (!existingInvitation) {
      const existingJoinRequest = ecosystemDocument.joinRequests.find(
        (el) =>
          getDocumentId(el.participant) ===
            getDocumentId(negotiation.participant) && el.status === "Pending"
      );

      if (existingJoinRequest) {
        existingJoinRequest.offerings = negotiation.policies;
        existingJoinRequest.status = "Authorized";
        await existingJoinRequest.save();

        if (!isParticipantAlreadyInEcosystem) {
          ecosystemDocument.participants.push({
            participant: getDocumentId(negotiation.participant),
            offerings: negotiation.policies,
            roles: existingJoinRequest.roles,
          });

          await ecosystemDocument.save();
        }
      }
    }

    // The last case is for a re-negotiation, in that case we need to
    // directly update the offerings inside of the participants array in the ecosystem
    // We can do it in all cases just as a global check so it doesn't need to be conditionned
    const existingParticipant = ecosystemDocument.participants.find(
      (p) => p.participant === getDocumentId(negotiation.participant)
    );
    if (existingParticipant) {
      let finalOfferings = [];
      if (negotiation.pricings.length > 0) {
        for (const element of negotiation.policies) {
          const findPricing = negotiation.pricings.find(
            (el: PricingConfiguration) =>
              el.serviceOffering === getDocumentId(element.serviceOffering)
          );
          finalOfferings.push({
            serviceOffering: getDocumentId(element.serviceOffering),
            policy: element.policy,
            pricing: {
              pricing: findPricing?.pricing || 0,
              pricingModel: findPricing?.pricingModel || [],
              pricingDescription: findPricing?.pricingDescription || "",
              currency: findPricing?.currency || "",
              billingPeriod: findPricing?.billingPeriod || "",
              costPerAPICall: findPricing?.costPerAPICall || 0,
              setupFee: findPricing?.setupFee || 0,
            },
          });
        }
      } else {
        finalOfferings = negotiation.policies?.map((el) => ({
          ...el,
          serviceOffering: getDocumentId(el.serviceOffering),
        }));
      }

      existingParticipant.offerings = finalOfferings;

      // Re-inject policies
      const participantSD = `${process.env.API_URL}/catalog/participants/${existingParticipant.participant}`;
      for (const offering of finalOfferings) {
        await deletePoliciesServiceOfferingEcosystemContract(
          ecosystemDocument.contract,
          getDocumentId(offering.serviceOffering),
          getDocumentId(existingParticipant.participant)
        );

        const serviceOfferings = finalOfferings.map((of: any) => ({
          participant: participantSD,
          serviceOffering: `${
            process.env.API_URL
          }/catalog/serviceofferings/${getDocumentId(of.serviceOffering)}`,
          policies: of.policy,
        }));

        //add service offerings anc policies
        //Inject policies in the contract
        for (const serviceOffering of serviceOfferings) {
          serviceOffering.policies.map((element) => {
            element.values.target = `${process.env.API_URL}/catalog/serviceofferings/${element.values.target}`;
          });
          await batchInjectPoliciesServiceOfferingEcosystemContract(
            ecosystemDocument.contract,
            serviceOffering
          );
        }
      }
    }
    await ecosystemDocument.save();

    return res.status(200).json({
      message: "successfully accepted negotiation",
      negotiation,
    });
  } catch (err) {
    next(err);
  }
};
