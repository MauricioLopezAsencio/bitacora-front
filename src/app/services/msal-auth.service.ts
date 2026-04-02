import { Injectable } from '@angular/core';
import {
  PublicClientApplication,
  AccountInfo,
  PopupRequest,
  SilentRequest,
  Configuration
} from '@azure/msal-browser';
import { Constants } from '../utils/Constants';

const GRAPH_CALENDAR_SCOPE = 'https://graph.microsoft.com/Calendars.Read';

@Injectable({ providedIn: 'root' })
export class MsalAuthService {

  private msalInstance: PublicClientApplication;
  private initPromise: Promise<void>;

  constructor() {
    const config: Configuration = {
      auth: {
        clientId: Constants.msal.clientId,
        authority: `https://login.microsoftonline.com/${Constants.msal.tenantId}`,
        redirectUri: Constants.msal.redirectUri
      },
      cache: {
        cacheLocation: 'sessionStorage'
      }
    };
    this.msalInstance = new PublicClientApplication(config);
    this.initPromise = this.msalInstance.initialize();
  }

  async acquireToken(): Promise<string> {
    await this.initPromise;
    const scopes: string[] = [GRAPH_CALENDAR_SCOPE];
    const accounts = this.msalInstance.getAllAccounts();

    if (accounts.length > 0) {
      this.msalInstance.setActiveAccount(accounts[0]);
      try {
        const silent: SilentRequest = { scopes, account: accounts[0] };
        const result = await this.msalInstance.acquireTokenSilent(silent);
        return result.accessToken;
      } catch {
        // token expired or not found silently — fall through to popup
      }
    }

    const popup: PopupRequest = { scopes, prompt: 'select_account' };
    const result = await this.msalInstance.loginPopup(popup);
    if (result.account) {
      this.msalInstance.setActiveAccount(result.account);
    }
    return result.accessToken;
  }

  async getAccountName(): Promise<string | null> {
    await this.initPromise;
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;
    const account: AccountInfo = accounts[0];
    return account.name ?? account.username ?? null;
  }

  async logout(): Promise<void> {
    await this.initPromise;
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      await this.msalInstance.logoutPopup({ account: accounts[0] });
    }
  }
}
