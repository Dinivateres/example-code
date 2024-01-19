export type AngelListe = {
  [key: string]: {
    angelt: boolean;
    fische: string[];
    punkte: number;
  };
};

export type FischListe = {
  müll: string[];
  klein: string[];
  mittel: string[];
  gross: string[];
  points: {
    [key: string]: number;
  };
  phrases: {
    [key: string]: string;
  };
};
