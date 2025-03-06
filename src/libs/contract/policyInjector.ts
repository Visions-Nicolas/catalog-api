import axios from "axios";
import { CONFIG } from "../../config/environment";
import { getContractServiceHeaders } from "./utils";

type BatchRoleAndObligationInjection = {
  contractId: string;
  rolesAndObligations: {
    role: string;
    ruleId: string;
    values: { [key: string]: string | number | Date };
  }[];
};

type BilateralPolicyInjectionOptions = {
  /**
   * The policy uid from the registry
   */
  policyId: string;

  /**
   * The id of the contract to which the policy will be injected
   */
  contractId: string;

  /**
   * The values that should be injected in the policy
   * for the "requestedFields"
   */
  values: { [key: string]: string | Date | number };
};

export type BilateralPolicyBatchInjectionOptions = {
  /**
   * The id of the contract to which the policy will be injected
   */
  contractId: string;

  rules: {
    /**
     * The rule uid from the registry
     */
    ruleId: string;

    /**
     * The values that should be injected in the policy
     * for the "requestedFields"
     */
    values: { [key: string]: string | Date | number };
  }[];
};

/**
 * Transition from OfferingPolicyConfiguration to the requirements
 * for the contract service
 */
export type EcosystemServiceOfferingInjection = {
  /**
   * The id of the participant
   */
  participant: string;
  /**
   * The id of the service offering
   */
  serviceOffering: string;
  policies: {
    /**
     * The rule uid from the registry
     */
    ruleId: string;
    /**
     * The values that should be injected in the policy
     * for the "requestedFields"
     */
    values: { [key: string]: string | number | Date };
  }[];
};

export const batchInjectRoleAndObligations = async (
  options: BatchRoleAndObligationInjection
) => {
  const res = await axios({
    url:
      CONFIG.contractServiceEndpoint +
      "/contracts/policies/" +
      options.contractId,
    method: "PUT",
    headers: getContractServiceHeaders(),
    data: options.rolesAndObligations,
  });
  return res.data;
};

export const injectPolicyInBilateralContract = async (
  options: BilateralPolicyInjectionOptions
) => {
  const res = await axios({
    url:
      CONFIG.contractServiceEndpoint +
      "/contracts/policy/" +
      options.contractId,
    method: "PUT",
    headers: getContractServiceHeaders(),
    data: options,
  });

  return res.data;
};

export const batchInjectPoliciesInBilateralContract = async (
  options: BilateralPolicyBatchInjectionOptions
) => {
  const res = await axios({
    url:
      CONFIG.contractServiceEndpoint +
      "/bilaterals/policies/" +
      options.contractId,
    method: "PUT",
    headers: getContractServiceHeaders(),
    data: options.rules,
  });

  return res.data;
};

export const batchInjectPoliciesServiceOfferingEcosystemContract = async (
  contractId: string,
  options: EcosystemServiceOfferingInjection
) => {
  const res = await axios({
    url:
      process.env.CONTRACT_SERVICE_ENDPOINT +
      "/contracts/policies/offering/" +
      contractId,
    method: "PUT",
    headers: getContractServiceHeaders(),
    data: options,
  });
  return res.data;
};

export const deletePoliciesServiceOfferingEcosystemContract = async (
  contractId: string,
  offeringId: string,
  participantId: string
) => {
  const res = await axios({
    url:
      process.env.CONTRACT_SERVICE_ENDPOINT +
      `/contracts/policies/offering/${contractId}/${offeringId}/${participantId}`,
    method: "DELETE",
    headers: getContractServiceHeaders(),
  });
  return res.data;
};
