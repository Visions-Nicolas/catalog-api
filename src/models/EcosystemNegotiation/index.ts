import mongoose from "mongoose";
import {
  IEcosystemNegotiation,
  IEcosystemNegotiationModel,
} from "../../types/ecosystemnegotiation";
import { ecosystemNegotiationSchema } from "./EcosystemNegotiation.model";
import { methods } from "./EcosystemNegotiation.methods";

methods(ecosystemNegotiationSchema);

export const EcosystemNegotiation = mongoose.model<
  IEcosystemNegotiation,
  IEcosystemNegotiationModel
>("EcosystemNegotiation", ecosystemNegotiationSchema);
