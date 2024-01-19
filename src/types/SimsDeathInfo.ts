export type SimsDeathInfo = {
  position: number;
  nameOfSim: string;
  causeOfDeath: string | null;
  dateOfDeath: Date | null;
  wildcard: boolean;
};
