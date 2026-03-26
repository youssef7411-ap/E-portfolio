import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

export const generateToken = (data) => {
  return jwt.sign(data, process.env.JWT_SECRET || 'your_secret', { expiresIn: '30d' });
};

export const hashPassword = async (password) => {
  return await bcryptjs.hash(password, 10);
};

export const comparePassword = async (password, hash) => {
  return await bcryptjs.compare(password, hash);
};
