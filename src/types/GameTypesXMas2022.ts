export type WeihnachtsUser = {
  tuerchen: number[];
  elfenhefen: {
    lastUsed: number;
  };
  rentier: Rentier;
  objekte: {
    gefunden: {
      [key: string]: number;
    };
    gewichtelt: {
      [key: string]: number;
    };
  };
  deko: {
    [key: string]: number;
  };
  wichtelpunkte: number;
  postkarten: number;
};

export type Rentier = {
  lastUsed: number;
  alreadyHas: boolean;
  name: string;
  attribute: RentierAttribute;
  awayTime: number;
  futter: number;
};

export type RentierAttributeListe = {
  fellFarbe: string[];
  fellZeichnung: string[];
  fellStruktur: string[];
  geweihFarbe: string[];
  persoenlichkeit: string[];
};

export type RentierAttribute = {
  fellFarbe: string;
  fellZeichnung: string;
  fellStruktur: string;
  geweihFarbe: string;
  persoenlichkeit: string;
};

export type WeihnachtsGegenstaende = {
  stufe1: string[];
  stufe2: string[];
  stufe3: string[];
  rentierFutter: string[];
  deko: string[];
};

export type GewinnerFile = {
  postkarten: {
    postkartenWahrscheinlichkeit: number;
    tage: {
      [key: string]: string;
    };
  };
  gegenstände: string[];
  deko: string[];
  wichtelpunkte: string[];
};
