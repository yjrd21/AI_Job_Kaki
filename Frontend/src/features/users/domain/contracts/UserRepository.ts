import type {User,UserUpdate} from '../models/User';
export interface UserRepository {get(id:string):Promise<User>;update(id:string,patch:UserUpdate):Promise<User>;delete(id:string):Promise<void>}
