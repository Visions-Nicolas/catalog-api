import { publicServiceSelect } from "./publicModelSelection";

export const ECOSYSTEM_PARTICIPANT_POPULATION = [
  {
    path: "participant",
    model: "Participant",
  },
];

export const ECOSYSTEM_POPULATION = [
  {
    path: "administrator",
    select: publicServiceSelect,
  },
  {
    path: "orchestrator",
    model: "Participant",
  },
  {
    path: "participants",
    populate: ECOSYSTEM_PARTICIPANT_POPULATION,
  },
  {
    path: "joinRequests",
    populate: ECOSYSTEM_PARTICIPANT_POPULATION,
  },
  {
    path: "invitations",
    populate: ECOSYSTEM_PARTICIPANT_POPULATION,
  },
  { path: "searchedDatatypes" },
  { path: "searchedServices" },
  "useCases",
];

export const serviceEcosystemsPopulation = {
  path: "ecosystems",
  populate: {
    path: "ecosystem",
    populate: [
      "searchedDatatypes",
      "searchedServices",
      {
        path: "participants.organization",
        select: "name logo",
      },
    ],
  },
};

export const serviceOfferingPopulation = [
  {
    path: "providedBy",
    model: "Participant",
    populate: {
      path: "associatedOrganisation",
      model: "Service",
      select: publicServiceSelect,
    },
  },
  {
    path: "dataResources",
    model: "DataResource",
  },
  {
    path: "softwareResources",
    model: "SoftwareResource",
  },
];

export const participantPopulation = [
  {
    path: "associatedOrganisation",
    model: "Service",
    select: publicServiceSelect,
  },
];

export const genericParticipantPopulation = (options: {
  pathName: string;
  populate?: boolean;
}) => {
  const { pathName, populate } = options;
  const shouldPopulate = populate === undefined ? false : populate;

  const res: any = {
    path: pathName,
    model: "Participant",
  };

  if (shouldPopulate) res.populate = participantPopulation;
  return res;
};

export const genericEcosystemPopulation = (options: {
  pathName: string; // Usually "ecosystem"
  populate?: boolean;
}) => {
  const { pathName, populate } = options;
  const shouldPopulate = populate === undefined ? false : populate;

  const res: any = {
    path: pathName,
    model: "Ecosystem",
  };

  if (shouldPopulate) res.populate = ECOSYSTEM_POPULATION;
  return res;
};

export const ecosystemNegotiationPopulation = {
  all: [
    genericParticipantPopulation({
      pathName: "participant",
      populate: true,
    }),
    genericEcosystemPopulation({
      pathName: "ecosystem",
      populate: true,
    }),
    {
      path: "policies.serviceOffering",
      model: "ServiceOffering",
      populate: serviceOfferingPopulation,
    },
    {
      path: "pricings.serviceOffering",
      model: "ServiceOffering",
      populate: serviceOfferingPopulation,
    },
  ],
  participant: [
    genericParticipantPopulation({
      pathName: "participant",
      populate: true,
    }),
  ],
  ecosystem: [
    genericEcosystemPopulation({
      pathName: "ecosystem",
      populate: true,
    }),
  ],
};
