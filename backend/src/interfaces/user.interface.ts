import { Role, UserStatus } from '../generated/prisma/enums';

export interface UserInfo{
    id: number;
    phone: string;
    email: string;
    name?: string;
    status: UserStatus;
    role: Role;
}

export interface UserValidate extends UserInfo{
    password: string;
}

export interface UserAccount{
    id: number;
    phone: string;
    name?: string | null;
    role: Role;
}