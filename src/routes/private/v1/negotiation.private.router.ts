import { Router } from "express";
import { body } from "express-validator";
import { verifyJwtMiddleware } from "../../../middleware/auth";
import {
  acceptEcosystemNegotiation,
  acceptNegotiation,
  authorizeExchangeConfiguration,
  createEcosystemNegotiation,
  createServiceOfferingAccessRequest,
  getEcosystemNegotiationById,
  getEcosystemNegotiationForParticipant,
  getExchangeConfigurationById,
  getMyEcosystemNegotiations,
  getMyExchangeConfigurations,
  negotiateEcosystemNegotiationPolicies,
  negotiateExchangeConfigurationPolicy,
  signExchangeConfiguration,
} from "../../../controllers/private/v1/negotiation.private.controller";
import { isPolicyArray, validate } from "../../../middleware/validator";

const router: Router = Router();

router.use(verifyJwtMiddleware);

router.get("/", getMyExchangeConfigurations);
router.get("/:id", getExchangeConfigurationById);
router.post(
  "/",
  [
    body("provider").isString().notEmpty().trim(),
    body("consumer").isString().notEmpty().trim(),
    body("providerServiceOffering").isString().notEmpty().trim(),
    body("consumerServiceOffering").isString().notEmpty().trim(),
  ],
  validate,
  createServiceOfferingAccessRequest
);
router.put(
  "/:id",
  [body("policy").exists().custom(isPolicyArray)],
  validate,
  authorizeExchangeConfiguration
);

router.put(
  "/:id/negotiate",
  [body("policy").exists().custom(isPolicyArray)],
  validate,
  negotiateExchangeConfigurationPolicy
);

router.put("/:id/accept", acceptNegotiation);

router.put(
  "/:id/sign",
  [body("signature").isString().notEmpty().trim()],
  validate,
  signExchangeConfiguration
);

router.post(
  "/ecosystem",
  [
    body("ecosystem").isString().notEmpty().trim(),
    body("participant").isString().notEmpty().trim(),
    body("policies").isArray(),
    body("pricings").isArray(),
    body("roles").isArray(),
  ],
  validate,
  createEcosystemNegotiation
);

router.get("/ecosystem/me", getMyEcosystemNegotiations);
router.get("/ecosystem/:id", getEcosystemNegotiationById);
router.get(
  "/ecosystem/:participantId/:ecosystemId",
  getEcosystemNegotiationForParticipant
);

router.put(
  "/ecosystem/:ecosystemId",
  [
    body("policies").isArray(),
    body("pricings").isArray(),
    body("participant").isString().notEmpty().trim(),
  ],
  validate,
  negotiateEcosystemNegotiationPolicies
);

router.put(
  "/ecosystem/:ecosystemId/accept",
  [body("participant").isString().notEmpty().trim()],
  validate,
  acceptEcosystemNegotiation
);

export default router;
