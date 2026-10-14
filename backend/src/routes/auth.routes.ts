import { Router } from 'express';
import { authOf, requireAuth } from '../middleware/auth';
import { parse } from '../middleware/validate';
import { getUser, login, signup, updateProfile } from '../services/authService';
import { loginSchema, signupSchema, updateProfileSchema } from './schemas';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  const input = parse(signupSchema, req.body);
  res.status(201).json(await signup(input));
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);
  res.json(await login(email, password));
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: await getUser(authOf(req).userId) });
});

/** Update display name and social accounts. */
authRouter.patch('/me', requireAuth, async (req, res) => {
  const input = parse(updateProfileSchema, req.body);
  res.json({ user: await updateProfile(authOf(req).userId, input) });
});
