const JWT_SECRET = 'fairgig_super_secret_jwt_key_2024_production';
const JWT_EXPIRES_IN = '7d';

const SERVICES = {
  AUTH: 'http://localhost:5000',
  EARNINGS: 'http://localhost:8001',
  ANOMALY: 'http://localhost:8002',
  ANALYTICS: 'http://localhost:8003',
  GRIEVANCE: 'http://localhost:5001',
  CERTIFICATE: 'http://localhost:8004',
};

const ROLES = {
  WORKER: 'worker',
  VERIFIER: 'verifier',
  ADVOCATE: 'advocate',
};

module.exports = { JWT_SECRET, JWT_EXPIRES_IN, SERVICES, ROLES };
