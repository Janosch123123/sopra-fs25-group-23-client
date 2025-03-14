export interface User {
  id: string | null;
  username: string | null;
  token: string | null;
  status: string | null;
  creationDate: string;
  birthDate: string | null;
  password: string;
}
