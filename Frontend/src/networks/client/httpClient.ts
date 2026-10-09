import axios from 'axios';
import {env} from '../../app/config/env';
import {normalizeApiError} from '../errors/ApiError';
let getToken:()=>Promise<string|undefined>=async()=>undefined;
export function configureAccessToken(provider:()=>Promise<string|undefined>){getToken=provider}
export const httpClient=axios.create({baseURL:env.apiBaseUrl,timeout:20000});
httpClient.interceptors.request.use(async config=>{const token=await getToken();if(token)config.headers.set('Authorization',`Bearer ${token}`);return config});
httpClient.interceptors.response.use(response=>response,error=>Promise.reject(normalizeApiError(error)));
