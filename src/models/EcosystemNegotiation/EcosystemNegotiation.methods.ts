import { Schema, Types } from "mongoose";
import {
  IEcosystemNegotiation,
  IEcosystemNegotiationModel,
  IEcosystemNegotiationMethods,
} from "../../types/ecosystemnegotiation";

export const methods = (
  schema: Schema<
    IEcosystemNegotiation,
    IEcosystemNegotiationModel,
    IEcosystemNegotiationMethods
  >
) => {};
