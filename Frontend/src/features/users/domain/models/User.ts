export interface User {id:string;keycloakId:string;email:string;firstName:string;lastName:string;createdAt:string;updatedAt:string}
export type UserUpdate=Partial<Pick<User,'email'|'firstName'|'lastName'>>;
