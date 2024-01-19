import { Greeting } from './Greeting';

export type GreetingsData = {
  [key: string]: {
    timestampLastMessage: number;
    greetings: Greeting[];
  };
};
