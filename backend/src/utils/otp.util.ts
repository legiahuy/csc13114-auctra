export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateToken = (): string => {
  return require('crypto').randomBytes(32).toString('hex');
};

