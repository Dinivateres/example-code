export type School = {
  places: string[];
  objects: {
    [key: string]: {
      value: number;
      probability: number;
    };
  };
  zeroPoints: string[];
  players: {
    [key: string]: [string, string, string];
  };
};

export type SchoolScore = {
  users: {
    [key: string]: number;
  };
  winners: string[];
};

export type SchulraudiSafety = string[];

export type SchulraudiMessages = {
  victimTexts: string[];
  safeTexts: string[];
};
