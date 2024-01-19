import ErrorTO from './ErrorTO';

export default interface ApiErrorTO {
  status: string;
  message: string;
  errors: ErrorTO[];
  timestamp: Date;
}
