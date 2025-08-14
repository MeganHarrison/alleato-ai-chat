import { SignJWT, jwtVerify } from 'jose';
import { hash, compare } from 'bcrypt-ts';
import { nanoid } from 'nanoid';
import type { Env } from '../types/env';

export interface User {
  id: string;
  email: string;
  password?: string;
  type: 'guest' | 'regular';
  createdAt: string;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: string;
}

export class AuthService {
  constructor(private env: Env) {}

  async createUser(email: string, password: string): Promise<User> {
    const hashedPassword = await hash(password, 10);
    const user: User = {
      id: nanoid(),
      email,
      password: hashedPassword,
      type: 'regular',
      createdAt: new Date().toISOString(),
    };
    
    // Store in D1
    await this.env.DB.prepare(
      'INSERT INTO User (id, email, password) VALUES (?, ?, ?)'
    ).bind(user.id, user.email, user.password).run();
    
    return user;
  }

  async createGuestUser(): Promise<User> {
    const user: User = {
      id: `guest_${nanoid()}`,
      email: `guest_${nanoid()}@alleato.ai`,
      type: 'guest',
      createdAt: new Date().toISOString(),
    };
    
    // Store in D1
    await this.env.DB.prepare(
      'INSERT INTO User (id, email) VALUES (?, ?)'
    ).bind(user.id, user.email).run();
    
    return user;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM User WHERE email = ?'
    ).bind(email).first();
    
    if (!result || !result.password) {
      return null;
    }
    
    const valid = await compare(password, result.password as string);
    if (!valid) {
      return null;
    }
    
    return {
      id: result.id as string,
      email: result.email as string,
      type: 'regular',
      createdAt: result.createdAt as string,
    };
  }

  async createSession(user: User): Promise<Session> {
    const token = await this.generateJWT(user);
    const session: Session = {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    // Store session in KV
    await this.env.SESSIONS.put(
      `session:${token}`,
      JSON.stringify(session),
      { expirationTtl: 7 * 24 * 60 * 60 }
    );
    
    return session;
  }

  async validateSession(token: string): Promise<User | null> {
    try {
      const secret = new TextEncoder().encode(this.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      
      // Get user from database
      const result = await this.env.DB.prepare(
        'SELECT * FROM User WHERE id = ?'
      ).bind(payload.sub).first();
      
      if (!result) {
        return null;
      }
      
      return {
        id: result.id as string,
        email: result.email as string,
        type: payload.type as 'guest' | 'regular',
        createdAt: result.createdAt as string,
      };
    } catch {
      return null;
    }
  }

  private async generateJWT(user: User): Promise<string> {
    const secret = new TextEncoder().encode(this.env.JWT_SECRET);
    
    return await new SignJWT({
      email: user.email,
      type: user.type,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);
  }
}