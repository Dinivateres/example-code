import axios from 'axios';
import { logger } from '../functions';
import ApiErrorTO from '../TOs/ApiErrorTO';

const errorResponseHandling = (res: any) => {
  if (res && !res.response && res instanceof Error) {
    return res.message;
  }

  let errorMsg = '';
  if (res.response) {
    const apiErrorTO: ApiErrorTO = res.response.data;
    errorMsg = apiErrorTO.message;
    if (apiErrorTO.errors?.length > 0) {
      errorMsg += '\n';
      apiErrorTO.errors.forEach((error) => {
        errorMsg += error.message + '\n';
      });
    }
  } else {
    errorMsg = 'Error code: ' + res?.code;
  }
  return errorMsg;
};

const errorHandling = (url: string, res: any) => {
  logger(url + ' -> ' + errorResponseHandling(res));
  if (res?.response?.data) {
    return res.response.data;
  }
};

const getHeader = (token?: string) => {
  if (token) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }
  return {};
};

const apiCall = {
  get: (url: string, token?: string) => {
    return axios
      .get(url, getHeader(token))
      .then((res) => {
        return res.data;
      })
      .catch((res) => {
        return errorHandling(url, res);
      });
  },
  post: (url: string, payload: unknown, token?: string) => {
    return axios
      .post(url, payload, getHeader(token))
      .then((res) => {
        return res.data;
      })
      .catch((res) => {
        return errorHandling(url, res);
      });
  },
  delete: (url: string, token?: string) => {
    return axios
      .delete(url, getHeader(token))
      .then((res) => {
        return res.data;
      })
      .catch((res) => {
        return errorHandling(url, res);
      });
  },
};

export default apiCall;
