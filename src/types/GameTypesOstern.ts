export type Eiersuche = {
  winners: string[];
  users: {
    [key: string]: number;
  };
};

export type Ostereier = {
  orte: string[];
  ostereier: string[];
  ostereierWerte: {
    [key: string]: number;
  };
  players: {
    [key: string]: string[];
  };
};
