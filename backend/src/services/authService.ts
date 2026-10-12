import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { UserModel, type Role } from '../models/User';
import { HttpError } from '../utils/httpError';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TokenPayload {
  sub: string;
  role: Role;
}

function signToken(user: AuthUser): string {
  const payload: TokenPayload = { sub: user.id, role: user.role };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string' || !decoded.sub || !decoded.role) {
    throw HttpError.unauthorized('Invalid token');
  }
  return { sub: String(decoded.sub), role: decoded.role as Role };
}

export async function signup(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<{ token: string; user: AuthUser }> {
  const existing = await UserModel.exists({ email: input.email.toLowerCase() });
  if (existing) throw HttpError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, 10);
  try {
    const doc = await UserModel.create({ ...input, passwordHash });
    const user: AuthUser = { id: String(doc._id), name: doc.name, email: doc.email, role: doc.role };
    return { token: signToken(user), user };
  } catch (err) {
    // Two signups with the same email racing past the exists() check.
    if ((err as { code?: number }).code === 11000) {
      throw HttpError.conflict('An account with this email already exists');
    }
    throw err;
  }
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const doc = await UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  // Same message for unknown email and wrong password, so emails can't be probed.
  if (!doc || !(await bcrypt.compare(password, doc.passwordHash))) {
    throw HttpError.unauthorized('Invalid email or password');
  }
  const user: AuthUser = { id: String(doc._id), name: doc.name, email: doc.email, role: doc.role };
  return { token: signToken(user), user };
}

export async function getUser(id: string): Promise<AuthUser> {
  const doc = await UserModel.findById(id).lean();
  if (!doc) throw HttpError.unauthorized('Account no longer exists');
  return { id: String(doc._id), name: doc.name, email: doc.email, role: doc.role };
}
