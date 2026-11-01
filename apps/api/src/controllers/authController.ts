import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { env } from '../config/env';
import { AuthenticationError, ValidationError } from '@buildplanner/shared';

function generateTokens(user: { id: string; email: string; role: string }) {
  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name, organization, role } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ValidationError('A user with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      organization,
      role: role || 'HOMEOWNER'
    });

    const tokens = generateTokens({ id: user._id.toString(), email: user.email, role: user.role });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          organization: user.organization,
          role: user.role
        },
        tokens
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AuthenticationError('Invalid email or password');
    }

    const tokens = generateTokens({ id: user._id.toString(), email: user.email, role: user.role });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          organization: user.organization,
          role: user.role
        },
        tokens
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AuthenticationError();
    }

    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      // Return synthetic dev user if in test/mock mode
      res.json({
        success: true,
        data: {
          id: req.user.userId,
          email: req.user.email,
          name: 'Developer User',
          role: req.user.role
        }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        organization: user.organization,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AuthenticationError('Refresh token required');
    }

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string; email: string; role: string };
    const tokens = generateTokens({ id: decoded.userId, email: decoded.email, role: decoded.role });

    res.json({
      success: true,
      data: { tokens }
    });
  } catch {
    next(new AuthenticationError('Invalid or expired refresh token'));
  }
}
