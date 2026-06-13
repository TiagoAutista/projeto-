//pages/wfm/wfm-work-order.page.ts

import { Page, Locator, expect } from '@playwright/test';
import { WfmDataExtractor, WfmCamposConfig, WfmDadosExtraidos } from './components/wfm-data-extractor.component';

export class WfmWorkOrderPage {
  readonly page: Page;
  
  // Locators com auto-retry nativo do Playwright
  readonly contentArea: Locator;
  readonly loadingIndicator: Locator;
  readonly loginForm: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.contentArea = page.locator('#content, #main, .main').first();
    this.loadingIndicator = page.locator('.ui-blockui, .loading, [aria-busy="true"]');
    this.loginForm = page.locator('form[action*="login"], #loginForm, [id*="login"]').first();
    this.errorMessage = page.locator('.ui-message-error, .error-message, [role="alert"]').first();
  }

  async goto(url: string): Promise<void> {
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
  }

  // ✅ Usa assertions com auto-retry ao invés de waitForSelector
  async waitForPageLoad(): Promise<void> {
    await expect(this.contentArea).toBeVisible({ timeout: 15000 });
    
    // Aguardar loading desaparecer (se existir)
    await expect(this.loadingIndicator).toBeHidden({ timeout: 5000 }).catch(() => {
      // Loading pode não existir, continua normalmente
    });
  }

  // ✅ Usa assertions ao invés de verificar URL manualmente
  async isSessionExpired(): Promise<boolean> {
    try {
      await expect(this.loginForm).toBeVisible({ timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  async extrairDados(campos: WfmCamposConfig): Promise<WfmDadosExtraidos> {
    return await WfmDataExtractor.extrair(this.page, campos);
  }

  // ✅ Assertions com auto-retry do Playwright
  async validarDadosExtraidos(dados: WfmDadosExtraidos): Promise<void> {
    await expect(dados.cpf).not.toBe('FALHA_VALIDACAO_WFM');
    await expect(dados.cpf).not.toBe('N/A');
    await expect(dados.cpf).toMatch(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
  }
}
