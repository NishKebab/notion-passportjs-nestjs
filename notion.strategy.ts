// notion.strategy.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-oauth2';

/**
 * Configuration interface for Notion OAuth2 authentication.
 */
export interface NotionAuthConfig {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

/**
 * Response structure for Notion OAuth2 authentication.
 */
export interface NotionOAuthResponse {
  access_token: string;
  token_type: 'bearer';
  bot_id: string; // UUID format
  workspace_name: string;
  workspace_icon: string; // URL
  workspace_id: string; // UUID format
  owner: {
    type: 'user';
    user: {
      object: 'user';
      id: string; // UUID format
    };
  };
  duplicated_template_id: string | null;
  request_id: string; // UUID format
  email: string; // from state
}

/**
 * NotionStrategy class for handling OAuth2 authentication with Notion.
 */
@Injectable()
export class NotionStrategy extends PassportStrategy(Strategy, 'notion') {
  private readonly logger = new Logger(NotionStrategy.name);
  private readonly clientID: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    const config: NotionAuthConfig = {
      clientID: 'YOUR_CLIENT_ID', // Replace with your actual client ID
      clientSecret: 'YOUR_CLIENT_SECRET', // Replace with your actual client secret
      callbackURL: 'http://localhost:3001/auth/notion/callback',
    };

    super({
      authorizationURL: 'https://api.notion.com/v1/oauth/authorize',
      tokenURL: 'https://api.notion.com/v1/oauth/token',
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
      state: true,
      customHeaders: {
        Authorization: `Basic ${Buffer.from(`${config.clientID}:${config.clientSecret}`).toString('base64')}`,
        'Notion-Version': NotionStrategy.getNotionApiVersion(),
      },
      passReqToCallback: true,
    });

    this.clientID = config.clientID;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.callbackURL;
  }

  /**
   * Handles successful authentication.
   * @param user - The authenticated user data.
   */
  success(user: NotionOAuthResponse): void {
    super.success(user);
  }

  /**
   * Handles authentication errors.
   * @param err - The error encountered during authentication.
   */
  error(err: Error): void {
    super.error(err);
  }

  /**
   * Returns the current Notion API version.
   * @returns The Notion API version as a string.
   */
  public static getNotionApiVersion(): string {
    return '2022-06-28';
  }

  /**
   * Fetches the OAuth token from Notion's API.
   * @param code - The authorization code from Notion.
   * @returns The OAuth token response.
   * @throws UnauthorizedException if the request fails.
   */
  private async fetchOAuthToken(code: string): Promise<NotionOAuthResponse> {
    const encoded = Buffer.from(`${this.clientID}:${this.clientSecret}`).toString('base64');

    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${encoded}`,
      },
      body: JSON.stringify({
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to authenticate with Notion');
    }

    return response.json();
  }

  /**
   * Authenticates the user using the OAuth2 code from Notion.
   * @param req - The incoming request object.
   * @param options - Additional options for authentication.
   */
  async authenticate(req: Request, options: any): Promise<void> {
    if (!req.query.code) {
      options.state = req.query.email;
      return super.authenticate(req, options);
    }

    try {
      const oauthData = await this.fetchOAuthToken(req.query.code as string);
      const email = req.query.state;

      this.success({ ...oauthData, email });
    } catch (error) {
      this.logger.error('Error authenticating Notion user:', error);
      this.error(error);
    }
  }
}
