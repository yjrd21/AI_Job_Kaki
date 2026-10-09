import type {UserRepository} from '../../domain/contracts/UserRepository';import type {UserUpdate} from '../../domain/models/User';
export const getAccount=(r:UserRepository,id:string)=>r.get(id);
export const saveAccount=(r:UserRepository,id:string,update:UserUpdate)=>r.update(id,update);
