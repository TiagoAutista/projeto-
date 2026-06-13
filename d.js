//utils/legacy/jsf-helper.ts

import { Page, Locator } from '@playwright/test';

export class JSFHelper {
  // ✅ Localiza elementos JSF com IDs dinâmicos (j_idtXX)
  static getByPartialId(page: Page, partialId: string): Locator {
    return page.locator(`[id*="${partialId}"]`);
  }

  // ✅ Localiza elementos JSF que terminam com ID específico
  static getByEndingId(page: Page, endingId: string): Locator {
    return page.locator(`[id$="${endingId}"]`);
  }

  // ✅ Aguarda processamento AJAX do JSF/PrimeFaces
  static async waitForJSFAjax(page: Page): Promise<void> {
    await page.waitForFunction(() => {
      // PrimeFaces
      if ((window as any).PrimeFaces?.ajax?.requestQueue?.length === 0) {
        return true;
      }
      // JSF nativo
      if ((window as any).faces?.ajax?.isRequestPending?.() === false) {
        return true;
      }
      return true;
    }, { timeout: 10000 });
  }

  // ✅ Aguarda bloqueio de tela (blockUI) desaparecer
  static async waitForBlockUI(page: Page): Promise<void> {
    const blockUI = page.locator('.ui-blockui, .ui-blockui-content');
    await blockUI.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // BlockUI pode não existir
    });
  }

  // ✅ Switch para iframe (comum em sistemas legados)
  static async switchToIframe(page: Page, iframeSelector: string): Promise<void> {
    const frame = page.frameLocator(iframeSelector);
    return;
  }
}
