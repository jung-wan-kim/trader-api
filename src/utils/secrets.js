import crypto from 'crypto';
import config from '../config/environment.js';

/**
 * 민감한 데이터 암호화/복호화 유틸리티
 */
class SecretsManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    
    // 환경 변수에서 마스터 키 생성
    this.masterKey = this.deriveMasterKey(config.jwt.secret);
  }

  /**
   * 마스터 키 생성
   * @param {string} secret 
   * @returns {Buffer}
   */
  deriveMasterKey(secret) {
    return crypto.scryptSync(secret, 'salt', this.keyLength);
  }

  /**
   * 데이터 암호화
   * @param {string} plaintext 
   * @returns {string} 암호화된 데이터 (base64)
   */
  encrypt(plaintext) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.masterKey, { iv });
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // IV + 암호화된 데이터 + 태그를 결합하여 base64로 인코딩
      const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), tag]);
      return combined.toString('base64');
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  /**
   * 데이터 복호화
   * @param {string} encryptedData base64 인코딩된 암호화 데이터
   * @returns {string} 복호화된 데이터
   */
  decrypt(encryptedData) {
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      const iv = combined.slice(0, this.ivLength);
      const encrypted = combined.slice(this.ivLength, -this.tagLength);
      const tag = combined.slice(-this.tagLength);
      
      const decipher = crypto.createDecipher(this.algorithm, this.masterKey, { iv });
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * 해시 생성 (비밀번호 등)
   * @param {string} data 
   * @param {string} salt 
   * @returns {string}
   */
  hash(data, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(data, actualSalt, this.keyLength).toString('hex');
    return `${actualSalt}:${hash}`;
  }

  /**
   * 해시 검증
   * @param {string} data 
   * @param {string} hashedData 
   * @returns {boolean}
   */
  verifyHash(data, hashedData) {
    try {
      const [salt, hash] = hashedData.split(':');
      const expectedHash = crypto.scryptSync(data, salt, this.keyLength).toString('hex');
      return hash === expectedHash;
    } catch (error) {
      return false;
    }
  }

  /**
   * 안전한 랜덤 토큰 생성
   * @param {number} length 
   * @returns {string}
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 민감한 데이터 마스킹
   * @param {string} data 
   * @param {number} showLength 보여줄 문자 수
   * @returns {string}
   */
  maskSensitiveData(data, showLength = 4) {
    if (!data || data.length <= showLength) {
      return '*'.repeat(8);
    }
    
    const start = data.substring(0, showLength);
    const masked = '*'.repeat(Math.max(8, data.length - showLength));
    return start + masked;
  }

  /**
   * 환경 변수에서 민감한 정보 제거
   * @param {object} env 
   * @returns {object}
   */
  sanitizeEnvironment(env) {
    const sensitiveKeys = [
      'JWT_SECRET',
      'SUPABASE_SERVICE_ROLE_KEY',
      'FINNHUB_API_KEY',
      'EMAIL_PASS',
      'SENTRY_DSN',
      'SESSION_SECRET',
    ];

    const sanitized = { ...env };
    
    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = this.maskSensitiveData(sanitized[key]);
      }
    });

    return sanitized;
  }
}

// 싱글톤 인스턴스 생성
const secretsManager = new SecretsManager();

export default secretsManager;