import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

export const protect = async (req: Request | any, res: Response, next: NextFunction): Promise<void> => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');

      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          verified: true,
          verificationStatus: true
        }
      });

      if (req.user && req.user.status === 'SUSPENDED') {
        res.status(403).json({ message: 'Your account has been suspended for violating platform rules.' });
        return;
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const adminOnly = (req: Request | any, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

export const seniorOnly = (req: Request | any, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === 'SENIOR') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied: Only senior citizen accounts can perform this action.' });
  }
};

/**
 * Reusable middleware that enforces verified Senior Citizen status.
 * Requires:
 * 1. User authenticated
 * 2. User role is SENIOR
 * 3. Authoritative DB query confirms verified === true AND verificationStatus === 'VERIFIED'
 */
export const requireVerifiedSenior = async (req: Request | any, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user.role !== 'SENIOR') {
      res.status(403).json({ success: false, message: 'Access denied: Senior citizen privileges required.' });
      return;
    }

    // Direct database authority
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, verified: true, verificationStatus: true }
    });

    if (!user || user.role !== 'SENIOR' || !user.verified || user.verificationStatus !== 'VERIFIED') {
      res.status(403).json({
        success: false,
        message: 'Senior Citizen verification required. Please verify your account with a valid identity document before accessing this feature.'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('requireVerifiedSenior error:', error);
    res.status(500).json({ success: false, message: 'Server error during authorization check' });
  }
};

/**
 * Authoritative helper to check if a user is a verified Senior Citizen.
 */
export const isUserVerifiedSenior = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, verified: true, verificationStatus: true }
  });
  return !!user && user.role === 'SENIOR' && user.verified === true && user.verificationStatus === 'VERIFIED';
};
