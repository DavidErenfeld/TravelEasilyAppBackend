export interface IUser {
  _id?: string;
  email: string;
  password?: string;
  userName: string;
  imgUrl?: string;
  refreshTokens?: string[];
}
