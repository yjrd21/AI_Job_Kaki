import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import Keycloak from 'keycloak-js';import {env} from '../../../app/config/env';import {mockIdentity} from '../../../app/mocks/mockStore';import {configureAccessToken} from '../../../networks/client/httpClient';
type AuthState={ready:boolean;authenticated:boolean;userId:string|null;name:string;login:()=>Promise<void>;logout:()=>Promise<void>;error:string|null};
const Context=createContext<AuthState|null>(null);
const kc= !env.mock && env.keycloakUrl && env.keycloakRealm && env.keycloakClientId? new Keycloak({url:env.keycloakUrl,realm:env.keycloakRealm,clientId:env.keycloakClientId}):null;
export function AuthProvider({children}:{children:ReactNode}){
 const [ready,setReady]=useState(env.mock);const [authenticated,setAuthenticated]=useState(env.mock);const [error,setError]=useState<string|null>(null);const [name,setName]=useState(env.mock?mockIdentity.userName:'');
 useEffect(()=>{if(env.mock)return;if(!kc){setError('Keycloak configuration is missing. See .env.example.');setReady(true);return}let live=true;
 kc.init({onLoad:'check-sso',pkceMethod:'S256',checkLoginIframe:false}).then(ok=>{if(!live)return;setAuthenticated(ok);setName(String(kc.tokenParsed?.name||kc.tokenParsed?.preferred_username||''));setReady(true)}).catch(e=>{if(live){setError(e instanceof Error?e.message:'Authentication failed');setReady(true)}});
 configureAccessToken(async()=>{if(!kc?.authenticated)return undefined;await kc.updateToken(30);return kc.token});return()=>{live=false;configureAccessToken(async()=>undefined)}},[]);
 const value=useMemo<AuthState>(()=>({ready,authenticated,userId:env.mock?mockIdentity.userId:import.meta.env.VITE_SQL_USER_ID||null,name,error,
 login:async()=>{if(env.mock){setAuthenticated(true);return}await kc?.login({redirectUri:window.location.origin+'/dashboard'})},
 logout:async()=>{if(env.mock){setAuthenticated(false);return}await kc?.logout({redirectUri:window.location.origin})}}),[ready,authenticated,name,error]);
 return <Context.Provider value={value}>{children}</Context.Provider>}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider missing');return value}
