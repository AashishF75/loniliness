import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { toGeoJsonPoint } from '../utils/geo';
import { parseAndValidateDob, calculateAgeFromDob } from '../utils/dateValidation';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, password, age, dob, location, role, latitude, longitude } = req.body;

    if (!email || !name || !password) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      res.status(400).json({ success: false, message: 'Email already registered' });
      return;
    }

    // Explicit role authorization - only SENIOR and FAMILY may be registered publicly
    const selectedRole = role === 'FAMILY' ? 'FAMILY' : 'SENIOR';

    let resolvedAge: number | null = null;
    let resolvedDob: Date | null = null;

    if (selectedRole === 'SENIOR') {
      // DOB is strictly mandatory for Senior Citizen accounts
      if (!dob) {
        res.status(400).json({
          success: false,
          message: 'Date of birth is required for Senior Citizen registration.'
        });
        return;
      }

      // Strict validation of calendar date, format, leap years, and future bounds
      const dobValidation = parseAndValidateDob(dob);
      if (!dobValidation.valid || !dobValidation.dob) {
        res.status(400).json({
          success: false,
          message: dobValidation.error || 'Invalid Date of Birth.'
        });
        return;
      }

      // Birthday-aware age calculation - backend is the sole authority
      const serverCalculatedAge = calculateAgeFromDob(dobValidation.dob);
      if (serverCalculatedAge < 50) {
        res.status(400).json({
          success: false,
          message: 'Senior citizens must be aged 50 or above based on Date of Birth.'
        });
        return;
      }

      resolvedDob = dobValidation.dob;
      resolvedAge = serverCalculatedAge; // Client-provided age is completely ignored for seniors
    } else {
      // FAMILY role: DOB is optional; age is optional and unrestricted
      if (dob) {
        const dobValidation = parseAndValidateDob(dob);
        if (!dobValidation.valid || !dobValidation.dob) {
          res.status(400).json({
            success: false,
            message: dobValidation.error || 'Invalid Date of Birth.'
          });
          return;
        }
        resolvedDob = dobValidation.dob;
        resolvedAge = calculateAgeFromDob(dobValidation.dob);
      } else if (age) {
        const parsedAge = parseInt(age, 10);
        if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 130) {
          res.status(400).json({ success: false, message: 'Please enter a valid age.' });
          return;
        }
        resolvedAge = parsedAge;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const latNum = latitude ? parseFloat(latitude) : null;
    const lonNum = longitude ? parseFloat(longitude) : null;

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        age: resolvedAge,
        dob: resolvedDob,
        city: location,
        role: selectedRole,
        verified: false,
        verificationStatus: 'UNVERIFIED',
        latitude: latNum,
        longitude: lonNum,
        locationGeoJson: toGeoJsonPoint(latNum, lonNum) as any
      },
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      verified: user.verified,
      verificationStatus: user.verificationStatus,
      dob: user.dob,
      age: user.age,
      token: generateToken(user.id),
    });
  } catch (error: any) {
    console.error('Registration Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (user && user.status === 'SUSPENDED') {
      res.status(403).json({ success: false, message: 'Your account has been suspended for violating platform rules.' });
      return;
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        success: true,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        verificationStatus: user.verificationStatus,
        dob: user.dob,
        age: user.age,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error: any) {
    console.error('Login Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error during login' });
  }
};

export const getMe = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        city: true,
        age: true,
        dob: true,
        locality: true,
        bio: true,
        verified: true,
        verificationStatus: true,
        verifiedAt: true,
        verificationFailureReason: true,
        hobbies: true,
        latitude: true,
        longitude: true,
        eventReminder: true,
        showAge: true,
        showLocation: true,
        showInterests: true
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
